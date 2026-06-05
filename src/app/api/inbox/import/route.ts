import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeImportHash, type ImportFinancialFileType } from "@/lib/inbox/financial-file-import";
import { parseImportFile } from "@/lib/inbox/financial-import-pipeline";
import { isPdfParseError, pdfImportErrorResponse } from "@/lib/inbox/pdf-import-http";

const tipoSchema = z.enum(["EXTRATO_BANCARIO", "FATURA_CARTAO"]);

function guessExtension(fileName: string): "ofx" | "csv" | "pdf" | null {
  const lower = fileName.toLowerCase().trim();
  if (lower.endsWith(".ofx")) return "ofx";
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".pdf")) return "pdf";
  return null;
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return jsonError("Envie como multipart/form-data");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Falha ao ler multipart/form-data");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("Arquivo ausente (campo file)");
  }

  const tipoRaw = String(formData.get("tipo") ?? "").trim();
  const parsedTipo = tipoSchema.safeParse(tipoRaw);
  if (!parsedTipo.success) {
    return jsonError("Campo tipo inválido");
  }

  const tipo = parsedTipo.data as ImportFinancialFileType;
  const contaFinanceiraId = String(formData.get("contaFinanceiraId") ?? "").trim() || null;
  const cartaoId = String(formData.get("cartaoId") ?? "").trim() || null;

  if (tipo === "EXTRATO_BANCARIO" && !contaFinanceiraId) {
    return jsonError("contaFinanceiraId é obrigatório para EXTRATO_BANCARIO");
  }

  const userId = session.user.id;

  if (contaFinanceiraId) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: contaFinanceiraId, userId, isActive: true },
      select: { id: true },
    });
    if (!account) {
      return jsonError("Conta financeira não encontrada ou inválida", 404);
    }
  }

  if (cartaoId) {
    const card = await prisma.card.findFirst({
      where: { id: cartaoId, userId, isActive: true },
      select: { id: true },
    });
    if (!card) {
      return jsonError("Cartão não encontrado ou inválido", 404);
    }
  }

  const ext = guessExtension(file.name);
  if (!ext) {
    return jsonError("Formato não suportado. Use apenas .ofx, .csv ou .pdf");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const pdfPassword = String(formData.get("pdfPassword") ?? "").trim() || undefined;

  let imported = 0;
  let skippedDuplicates = 0;
  let failed = 0;

  try {
    const parsedLines = await parseImportFile({
      buffer,
      extension: ext,
      fileName: file.name,
      pdfPassword,
    });

    await prisma.$transaction(async (tx) => {
      for (const line of parsedLines) {
        try {
          const externalId = line.externalId?.trim() || null;

          const importHash = computeImportHash({
            userId,
            importType: tipo,
            sourceFileName: file.name,
            accountId: contaFinanceiraId,
            cardId: cartaoId,
            date: line.date,
            description: line.description,
            amount: line.amount,
            rawContent: line.rawContent,
          });

          if (externalId) {
            const exists = await tx.financialInbox.findFirst({
              where: { userId, channel: "WEB_IMPORT", externalId },
              select: { id: true },
            });
            if (exists) {
              skippedDuplicates += 1;
              continue;
            }
          } else {
            const exists = await tx.financialInbox.findFirst({
              where: { userId, channel: "WEB_IMPORT", importHash },
              select: { id: true },
            });
            if (exists) {
              skippedDuplicates += 1;
              continue;
            }
          }

          await tx.financialInbox.create({
            data: {
              userId,
              channel: "WEB_IMPORT",
              status: "NEEDS_CONFIRMATION",
              rawContent: line.rawContent,
              metadata: {
                importType: tipo,
                sourceFileName: file.name,
                ...(contaFinanceiraId ? { contaFinanceiraId } : {}),
                ...(cartaoId ? { cartaoId } : {}),
                ...(line.date ? { date: line.date } : {}),
                ...(typeof line.amount === "number" ? { amount: line.amount } : {}),
                ...(line.description ? { description: line.description } : {}),
                ...(externalId ? { externalId } : {}),
                importHash,
              },
              externalId,
              importHash,
            },
          });

          imported += 1;
        } catch {
          failed += 1;
        }
      }
    });
  } catch (error) {
    if (isPdfParseError(error)) {
      return pdfImportErrorResponse(error);
    }

    console.error("[inbox/import]", error);
    const message = error instanceof Error ? error.message : "Falha ao processar o arquivo";
    return jsonError(message, 400);
  }

  return NextResponse.json({ imported, skippedDuplicates, failed });
}

