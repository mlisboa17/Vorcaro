import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  importFinancialFileTypeSchema,
  importPreviewResponseSchema,
} from "@/modules/financial-inbox/domain/schemas/financial-import-api.schema";
import { buildPreviewLines, detectCardFromText, matchDetectedCard, parseImportFile } from "@/lib/inbox/financial-import-pipeline";
import { isPdfParseError, pdfImportErrorResponse } from "@/lib/inbox/pdf-import-http";
import type { ImportFinancialFileType } from "@/modules/financial-inbox/domain/types/imported-financial-line";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function guessExtension(fileName: string): "ofx" | "csv" | "pdf" | null {
  const lower = fileName.toLowerCase().trim();
  if (lower.endsWith(".ofx")) return "ofx";
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".pdf")) return "pdf";
  return null;
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

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonError("Falha ao ler multipart/form-data");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("Arquivo ausente (campo file)");
  }

  const tipoRaw = String(formData.get("tipo") ?? "").trim();
  const tipoParsed = importFinancialFileTypeSchema.safeParse(tipoRaw);
  if (!tipoParsed.success) {
    return jsonError("Campo tipo inválido");
  }

  const tipo = tipoParsed.data as ImportFinancialFileType;
  const contaFinanceiraId = String(formData.get("contaFinanceiraId") ?? "").trim() || null;
  const cartaoId = String(formData.get("cartaoId") ?? "").trim() || null;
  const dataCaixa = String(formData.get("dataCaixa") ?? "").trim() || undefined;
  const dataVencimentoFatura =
    String(formData.get("dataVencimentoFatura") ?? "").trim() || undefined;

  if (tipo === "EXTRATO_BANCARIO" && !contaFinanceiraId) {
    return jsonError("contaFinanceiraId é obrigatório para EXTRATO_BANCARIO");
  }

  const userId = session.user.id;
  if (contaFinanceiraId) {
    const owned = await prisma.financialAccount.findFirst({
      where: { id: contaFinanceiraId, userId, isActive: true },
      select: { id: true },
    });
    if (!owned) return jsonError("Conta financeira não encontrada ou inválida", 404);
  }

  if (cartaoId) {
    const owned = await prisma.card.findFirst({
      where: { id: cartaoId, userId, isActive: true },
      select: { id: true },
    });
    if (!owned) return jsonError("Cartão não encontrado ou inválido", 404);
  }

  const ext = guessExtension(file.name);
  if (!ext) {
    return jsonError("Formato não suportado. Use apenas .ofx, .csv ou .pdf");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const pdfPassword = String(formData.get("pdfPassword") ?? "").trim() || undefined;

  try {
    const parsedLines = await parseImportFile({
      buffer,
      extension: ext,
      fileName: file.name,
      pdfPassword,
    });
    const previewLines = await buildPreviewLines({
      db: prisma,
      userId,
      importType: tipo,
      sourceFileName: file.name,
      accountId: contaFinanceiraId,
      cardId: cartaoId,
      parsedLines,
      defaultDataCaixa: dataCaixa,
      defaultDataVencimentoFatura: dataVencimentoFatura,
    });

    const sourceText = [file.name, ...previewLines.map((line) => line.rawContent)].join(" ");
    const detectedCard =
      tipo === "FATURA_CARTAO" ? await matchDetectedCard(prisma, userId, detectCardFromText(sourceText)) : null;

    const duplicateCount = previewLines.filter((line) => line.isDuplicate).length;
    const response = {
      sourceFileName: file.name,
      importType: tipo,
      totals: {
        total: previewLines.length,
        duplicateCount,
        newCount: previewLines.length - duplicateCount,
      },
      detectedCard,
      invoiceDates:
        tipo === "FATURA_CARTAO"
          ? {
              ...(dataCaixa ? { dataCaixa } : {}),
              ...(dataVencimentoFatura ? { dataVencimentoFatura } : {}),
            }
          : undefined,
      previewSample: previewLines.slice(0, 20),
      lines: previewLines,
    };

    const validated = importPreviewResponseSchema.parse(response);
    return NextResponse.json(validated);
  } catch (error) {
    if (isPdfParseError(error)) {
      return pdfImportErrorResponse(error);
    }

    console.error("[inbox/import/preview]", error);
    const message = error instanceof Error ? error.message : "Falha ao gerar preview";
    return jsonError(message, 400);
  }
}

