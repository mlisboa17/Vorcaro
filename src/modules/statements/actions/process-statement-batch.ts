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
    if (!contaFinanceiraId) {
      return { success: false, importedCount: 0, error: "Conta de destino obrigatória" };
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["ofx", "csv", "pdf", "xls", "xlsx"].includes(ext)) {
      return { success: false, importedCount: 0, error: "Formato de arquivo não suportado" };
    }

    // Lê o arquivo para buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
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
      accountId: contaFinanceiraId,
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
      });
      importedCount++;
    }

    if (suggestionsToCreate.length > 0) {
      await prisma.statementLineSuggestion.createMany({
        data: suggestionsToCreate,
      });
    }

    revalidatePath("/dashboard/statements");
    return { success: true, importedCount };
  } catch (error) {
    console.error("[processStatementBatch] Erro ao processar lote:", error);
    return {
      success: false,
      importedCount: 0,
      error: error instanceof Error ? error.message : "Erro interno no processamento do lote",
    };
  }
}


