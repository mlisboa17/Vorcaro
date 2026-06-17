"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CounterpartyMatcherService } from "@/modules/integrations/services/counterparty-matcher.service";
import { parseImportFile, buildPreviewLines } from "@/lib/inbox/financial-import-pipeline";
import { revalidatePath } from "next/cache";

export interface ProcessStatementBatchResponse {
  success: boolean;
  importedCount: number;
  error?: string;
  diagnostic?: {
    format: string;
    linesProcessed: number;
  };
}

export async function processStatementBatch(formData: FormData): Promise<ProcessStatementBatchResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, importedCount: 0, error: "Não autorizado" };
    }
    const userId = session.user.id;

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, importedCount: 0, error: "Arquivo ausente" };
    }

    const contaFinanceiraId = String(formData.get("contaFinanceiraId") ?? "").trim() || null;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["ofx", "csv", "pdf", "xls", "xlsx"].includes(ext)) {
      return { success: false, importedCount: 0, error: "Formato de arquivo não suportado" };
    }

    // Lê o arquivo para buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // --- DETECÇÃO EM MEMÓRIA DE NOVA CONTA/CARTÃO ---
    let bankName = "Banco";
    let agency: string | null = null;
    let accountNumber: string | null = null;
    let cardLastFour: string | null = null;
    let isCheckingAccount = true;

    const fileContentStr = buffer.toString("utf-8").substring(0, 15000);
    const fileNameUpper = file.name.toUpperCase();

    if (fileNameUpper.includes("NUBANK")) {
      bankName = "NUBANK";
      if (fileNameUpper.includes("FATURA") || fileNameUpper.includes("CARD")) {
        isCheckingAccount = false;
      }
    } else if (fileNameUpper.includes("ITAU")) {
      bankName = "ITAÚ";
    } else if (fileNameUpper.includes("BRADESCO")) {
      bankName = "BRADESCO";
    } else if (fileNameUpper.includes("SANTANDER")) {
      bankName = "SANTANDER";
    } else if (fileNameUpper.includes("INTER")) {
      bankName = "INTER";
    }

    if (ext === "ofx") {
      const bankIdMatch = fileContentStr.match(/<BANKID>([^<\n\r]+)/i);
      const acctIdMatch = fileContentStr.match(/<ACCTID>([^<\n\r]+)/i);
      const acctTypeMatch = fileContentStr.match(/<ACCTTYPE>([^<\n\r]+)/i);
      
      if (bankIdMatch) {
        const bId = bankIdMatch[1].trim();
        if (bId === "260") bankName = "NUBANK";
        else if (bId === "341" || bId === "0341") bankName = "ITAÚ";
        else if (bId === "237" || bId === "0237") bankName = "BRADESCO";
        else if (bId === "033" || bId === "0033") bankName = "SANTANDER";
        else if (bId === "077" || bId === "0077") bankName = "INTER";
        else bankName = `Banco (${bId})`;
      }
      if (acctIdMatch) {
        accountNumber = acctIdMatch[1].trim();
      }
      if (acctTypeMatch && /credit/i.test(acctTypeMatch[1])) {
        isCheckingAccount = false;
      }
    } else {
      const agencyMatch = fileContentStr.match(/(?:agencia|agência|ag)\s*[:\-]?\s*(\d{4})/i);
      if (agencyMatch) agency = agencyMatch[1];

      const accountMatch = fileContentStr.match(/(?:conta|c\/c|cc)\s*[:\-]?\s*(\d{5,9}-?\d?)/i);
      if (accountMatch) accountNumber = accountMatch[1];

      const cardMatch = fileContentStr.match(/(?:cartao|cartão|card|final|fim)\s*[:\-]?\s*(\d{4})\b/i);
      if (cardMatch) {
        cardLastFour = cardMatch[1];
        isCheckingAccount = false;
      }
    }

    if (ext === "pdf" && process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenerativeAI, SchemaType } = await import("@google/generative-ai");
        const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = client.getGenerativeModel({
          model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                bankName: { type: SchemaType.STRING },
                agency: { type: SchemaType.STRING },
                accountNumber: { type: SchemaType.STRING },
                cardLastFour: { type: SchemaType.STRING },
                type: { type: SchemaType.STRING }
              },
              required: ["bankName", "type"]
            } as unknown as import("@google/generative-ai").Schema
          }
        });
        const prompt = "Analise o extrato e retorne as informações da conta/cartão emissor do extrato: bankName, agency, accountNumber, cardLastFour, type (CHECKING ou CREDIT_CARD).";
        const base64 = buffer.toString("base64");
        const result = await model.generateContent({
          contents: [
            { role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "application/pdf", data: base64 } }] }
          ]
        });
        const resText = result.response.text()?.trim();
        if (resText) {
          const parsed = JSON.parse(resText);
          if (parsed.bankName) bankName = parsed.bankName;
          if (parsed.agency) agency = parsed.agency;
          if (parsed.accountNumber) accountNumber = parsed.accountNumber;
          if (parsed.cardLastFour) cardLastFour = parsed.cardLastFour;
          if (parsed.type) isCheckingAccount = parsed.type === "CHECKING";
        }
      } catch (err) {
        console.error("Gemini metadata extraction failed:", err);
      }
    }

    // Check if the account or card already exists in the database
    let resolvedAccountId = contaFinanceiraId;
    let accountOrCardExists = false;
    if (isCheckingAccount) {
      const existingAcc = accountNumber
        ? await prisma.financialAccount.findFirst({
            where: {
              userId,
              isActive: true,
              OR: [
                { name: { contains: accountNumber } },
                { name: { contains: bankName, mode: "insensitive" } },
                { institutionName: { contains: bankName, mode: "insensitive" } }
              ]
            }
          })
        : await prisma.financialAccount.findFirst({
            where: {
              userId,
              isActive: true,
              OR: [
                { name: { contains: bankName, mode: "insensitive" } },
                { institutionName: { contains: bankName, mode: "insensitive" } }
              ]
            }
          });
      accountOrCardExists = !!existingAcc;
      if (existingAcc && !resolvedAccountId) {
        resolvedAccountId = existingAcc.id;
      }
    } else {
      const existingCard = cardLastFour
        ? await prisma.card.findFirst({
            where: {
              userId,
              isActive: true,
              OR: [
                { lastFourDigits: cardLastFour },
                { name: { contains: bankName, mode: "insensitive" } },
                { institutionName: { contains: bankName, mode: "insensitive" } }
              ]
            }
          })
        : await prisma.card.findFirst({
            where: {
              userId,
              isActive: true,
              OR: [
                { name: { contains: bankName, mode: "insensitive" } },
                { institutionName: { contains: bankName, mode: "insensitive" } }
              ]
            }
          });
      accountOrCardExists = !!existingCard;
      if (existingCard && !resolvedAccountId) {
        resolvedAccountId = existingCard.id;
      }
    }

    if (!accountOrCardExists) {
      await prisma.statementLineSuggestion.create({
        data: {
          userId,
          description: `Nova Conta Bancária Detectada: ${bankName}. Deseja vinculá-la ao seu perfil?`,
          amount: 0,
          date: new Date(),
          suggestedName: `__PENDING_ACCOUNT__:${bankName}:${isCheckingAccount ? "CHECKING" : "CREDIT_CARD"}:${agency || ""}:${accountNumber || ""}:${cardLastFour || ""}`,
          score: -99,
          status: "UNKNOWN",
          processed: false,
        }
      });
    }

    // Faz o parser das linhas brutas
    const parsedLines = await parseImportFile({
      buffer,
      extension: ext as any,
      fileName: file.name,
    });

    // Gera o preview das linhas limpas e filtra duplicados do banco
    const previewLines = await buildPreviewLines({
      db: prisma,
      userId,
      importType: "EXTRATO_BANCARIO",
      sourceFileName: file.name,
      accountId: resolvedAccountId,
      parsedLines,
    });

    const matcher = new CounterpartyMatcherService(prisma);
    let importedCount = 0;

    // --- Bulk Fetch das Transações PENDING ---
    const dates = previewLines
      .map((line) => (line.date ? new Date(line.date) : null))
      .filter((d): d is Date => d !== null);

    let minDate = new Date();
    let maxDate = new Date();
    if (dates.length > 0) {
      minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    }

    const queryStartDate = new Date(minDate);
    queryStartDate.setDate(queryStartDate.getDate() - 3);
    const queryEndDate = new Date(maxDate);
    queryEndDate.setDate(queryEndDate.getDate() + 3);

    // Consulta única para trazer todas as pendências da janela de tempo no tenant
    const pendingTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: "PENDING",
        date: {
          gte: queryStartDate,
          lte: queryEndDate,
        },
      },
      include: {
        originCounterparty: true,
        destinationCounterparty: true,
      },
    });

    // 1. Preload do usuário para obter o cnpjCpf da conta PJ (Direção do fluxo)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { cnpjCpf: true }
    });
    const userDoc = user?.cnpjCpf ? user.cnpjCpf.replace(/\D/g, "") : undefined;

    // 2. Preload das contrapartes e aliases do tenant
    let counterparties = await prisma.counterparty.findMany({
      where: { userId },
      include: {
        aliases: true,
      },
    });

    const cpByCnpj = new Map<string, typeof counterparties[0]>();
    const cpByName = new Map<string, typeof counterparties[0]>();
    const cpByAlias = new Map<string, typeof counterparties[0]>();

    const rebuildMaps = () => {
      cpByCnpj.clear();
      cpByName.clear();
      cpByAlias.clear();
      for (const cp of counterparties) {
        if (cp.cnpjCpf) {
          const cleanDoc = cp.cnpjCpf.replace(/\D/g, "");
          if (cleanDoc) {
            cpByCnpj.set(cleanDoc, cp);
          }
        }
        const normName = matcher.normalizeName(cp.name);
        cpByName.set(normName, cp);
        for (const aliasObj of cp.aliases) {
          const normAlias = aliasObj.alias.toUpperCase().trim();
          cpByAlias.set(normAlias, cp);
        }
      }
    };

    rebuildMaps();

    const findMatchInMemory = (name: string, cnpjCpf: string | null) => {
      const doc = cnpjCpf ? cnpjCpf.replace(/\D/g, "") : undefined;
      const normalizedName = matcher.normalizeName(name);

      if (doc) {
        const byDoc = cpByCnpj.get(doc);
        if (byDoc) {
          return {
            counterpartyId: byDoc.id,
            score: 100,
            status: "CONFIRMED" as const,
            name: byDoc.name,
          };
        }
      }

      const byName = cpByName.get(normalizedName);
      if (byName) {
        return {
          counterpartyId: byName.id,
          score: 95,
          status: "CONFIRMED" as const,
          name: byName.name,
        };
      }

      const byAlias = cpByAlias.get(normalizedName);
      if (byAlias) {
        return {
          counterpartyId: byAlias.id,
          score: 85,
          status: "INFERRED" as const,
          name: byAlias.name,
        };
      }

      return null;
    };

    // 3. Pre-processar novas contrapartes fora do loop principal
    const newCounterpartiesToCreate = new Map<string, { name: string; cnpjCpf: string | null; rawNames: Set<string> }>();

    for (const line of previewLines) {
      if (line.isDuplicate) continue;
      const docMatch = line.rawContent.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
      const cnpjCpf = docMatch ? docMatch[0] : null;
      const rawName = line.description || line.rawContent;
      const normalizedName = matcher.normalizeName(rawName);

      const match = findMatchInMemory(rawName, cnpjCpf);
      if (!match) {
        const existing = newCounterpartiesToCreate.get(normalizedName);
        if (existing) {
          if (cnpjCpf && !existing.cnpjCpf) {
            existing.cnpjCpf = cnpjCpf;
          }
          existing.rawNames.add(rawName);
        } else {
          newCounterpartiesToCreate.set(normalizedName, {
            name: rawName,
            cnpjCpf,
            rawNames: new Set([rawName]),
          });
        }
      }
    }

    if (newCounterpartiesToCreate.size > 0) {
      await Promise.all(
        Array.from(newCounterpartiesToCreate.values()).map(async (item) => {
          const normalizedName = matcher.normalizeName(item.name);
          const cleanDoc = item.cnpjCpf ? item.cnpjCpf.replace(/\D/g, "") : null;
          
          const cp = await prisma.counterparty.upsert({
            where: {
              userId_name: {
                userId,
                name: normalizedName,
              }
            },
            update: {
              ...(cleanDoc ? { cnpjCpf: cleanDoc } : {})
            },
            create: {
              userId,
              name: normalizedName,
              cnpjCpf: cleanDoc,
            },
          });

          for (const rawName of item.rawNames) {
            const rawNameUpper = rawName.toUpperCase().trim();
            if (rawNameUpper !== normalizedName) {
              await prisma.counterpartyAlias.create({
                data: {
                  counterpartyId: cp.id,
                  alias: rawNameUpper,
                }
              }).catch(() => {});
            }
          }
        })
      );

      // Atualiza lista em memória
      counterparties = await prisma.counterparty.findMany({
        where: { userId },
        include: {
          aliases: true,
        },
      });
      rebuildMaps();
    }

    // Processamento em lote das contrapartes e salvamento em lote no staging
    const suggestionsToCreate = [];
    for (const line of previewLines) {
      // Pula linhas que já foram detectadas como duplicadas no banco
      if (line.isDuplicate) continue;

      // Tenta extrair CNPJ/CPF do texto bruto se existir
      const docMatch = line.rawContent.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
      const cnpjCpf = docMatch ? docMatch[0] : null;
      const cleanDoc = cnpjCpf ? cnpjCpf.replace(/\D/g, "") : null;

      // Executa correspondência de contraparte (Em memória garantido)
      const rawName = line.description || line.rawContent;
      const matchResult = findMatchInMemory(rawName, cnpjCpf)!;

      // Avalia direção do fluxo (Em memória)
      const direction = (cleanDoc && userDoc && cleanDoc === userDoc) ? "INCOME" : "EXPENSE";

      // --- Smart Reconciliation em Memória ---
      const lineDate = line.date ? new Date(line.date) : new Date();
      const startDate = new Date(lineDate);
      startDate.setDate(startDate.getDate() - 3);
      const endDate = new Date(lineDate);
      endDate.setDate(endDate.getDate() + 3);

      const amount = line.amount || 0;
      const suggestedCategoryId = line.suggestedCategoryId ?? null;

      // Filtra os matches candidatos na memória do Node.js
      const candidateMatches = pendingTransactions.filter((tx) => {
        const matchAmount = Number(tx.amount) === amount;
        const txDate = new Date(tx.date);
        const matchDate = txDate >= startDate && txDate <= endDate;
        const matchCategory = tx.categoryId === suggestedCategoryId;
        const matchCounterparty = 
          (tx.originId && tx.originId === matchResult.counterpartyId) ||
          (tx.destinationId && tx.destinationId === matchResult.counterpartyId);

        return matchAmount && matchDate && (matchCategory || matchCounterparty);
      });

      // Critério de desempate: prioriza maior similaridade com o nome da contraparte externa
      let bestMatchId: string | null = null;
      if (candidateMatches.length > 0) {
        if (candidateMatches.length === 1) {
          bestMatchId = candidateMatches[0].id;
        } else {
          let bestScore = -1;
          let bestTx = candidateMatches[0];
          const targetName = matcher.normalizeName(rawName);
          
          for (const tx of candidateMatches) {
            const cpName = tx.originCounterparty?.name || tx.destinationCounterparty?.name || "";
            const normalizedCp = matcher.normalizeName(cpName);
            const score = normalizedCp === targetName ? 2 : (normalizedCp.includes(targetName) || targetName.includes(normalizedCp) ? 1 : 0);
            if (score > bestScore) {
              bestScore = score;
              bestTx = tx;
            }
          }
          bestMatchId = bestTx.id;
        }
      }

      suggestionsToCreate.push({
        userId,
        description: rawName,
        amount: line.amount || 0,
        date: line.date ? new Date(line.date) : new Date(),
        cnpjCpf: cnpjCpf ?? null,
        suggestedName: matchResult.name,
        originId: direction === "INCOME" ? matchResult.counterpartyId : null,
        destinationId: direction === "EXPENSE" ? matchResult.counterpartyId : null,
        score: matchResult.score,
        status: matchResult.status,
        reconciliationMatchId: bestMatchId,
        processed: false,
        financialAccountId: resolvedAccountId,
        fileHash: file.name + "_" + buffer.length.toString(),
        type: direction as "INCOME" | "EXPENSE",
        isDuplicateAlert: false,
        suggestedCategoryId: suggestedCategoryId,
      });
      importedCount++;
    }

    if (suggestionsToCreate.length > 0) {
      await prisma.statementLineSuggestion.createMany({
        data: suggestionsToCreate,
      });
    }

    let formatStr = ext.toUpperCase();
    if (formatStr === "PDF") formatStr = "PDF_BANCO";

    revalidatePath("/dashboard/statements");
    return { 
      success: true, 
      importedCount,
      diagnostic: {
        format: formatStr,
        linesProcessed: importedCount,
      }
    };
  } catch (error) {
    console.error("[processStatementBatch] Erro ao processar lote:", error);
    return {
      success: false,
      importedCount: 0,
      error: error instanceof Error ? error.message : "Erro interno no processamento do lote",
    };
  }
}


