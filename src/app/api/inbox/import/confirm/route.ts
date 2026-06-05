import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  importConfirmRequestSchema,
  importConfirmResponseSchema,
} from "@/modules/financial-inbox/domain/schemas/financial-import-api.schema";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = importConfirmRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = session.user.id;
  const data = parsed.data;

  if (data.contaFinanceiraId) {
    const owned = await prisma.financialAccount.findFirst({
      where: { id: data.contaFinanceiraId, userId, isActive: true },
      select: { id: true },
    });
    if (!owned) return jsonError("Conta financeira não encontrada ou inválida", 404);
  }

  if (data.cartaoId) {
    const owned = await prisma.card.findFirst({
      where: { id: data.cartaoId, userId, isActive: true },
      select: { id: true },
    });
    if (!owned) return jsonError("Cartão não encontrado ou inválido", 404);
  }

  let imported = 0;
  let skippedDuplicates = 0;
  let failed = 0;

  await prisma.$transaction(async (tx) => {
    for (const line of data.lines) {
      try {
        const duplicate = line.externalId
          ? await tx.financialInbox.findFirst({
              where: { userId, channel: "WEB_IMPORT", externalId: line.externalId },
              select: { id: true },
            })
          : await tx.financialInbox.findFirst({
              where: { userId, channel: "WEB_IMPORT", importHash: line.importHash },
              select: { id: true },
            });

        if (duplicate && data.skipDuplicates) {
          skippedDuplicates += 1;
          continue;
        }

        await tx.financialInbox.create({
          data: {
            userId,
            channel: "WEB_IMPORT",
            status: "NEEDS_CONFIRMATION",
            rawContent: line.rawContent,
            externalId: line.externalId ?? null,
            importHash: line.importHash,
            metadata: {
              bulkImport: true,
              importType: data.importType,
              sourceFileName: data.sourceFileName,
              ...(data.contaFinanceiraId ? { contaFinanceiraId: data.contaFinanceiraId } : {}),
              ...(data.cartaoId ? { cartaoId: data.cartaoId } : {}),
              ...(data.cardDetectionStatus ? { cardDetectionStatus: data.cardDetectionStatus } : {}),
              ...(line.date ? { date: line.date } : {}),
              ...(line.dataCompra ? { dataCompra: line.dataCompra } : {}),
              ...(line.dataCaixa ? { dataCaixa: line.dataCaixa } : {}),
              ...(line.dataVencimentoFatura
                ? { dataVencimentoFatura: line.dataVencimentoFatura }
                : {}),
              ...(typeof line.amount === "number" ? { amount: line.amount } : {}),
              ...(line.description ? { description: line.description } : {}),
              ...(line.descricaoBase ? { descricaoBase: line.descricaoBase } : {}),
              ...(line.installment ? { installment: line.installment } : {}),
              ...(line.totalInstallments ? { totalInstallments: line.totalInstallments } : {}),
              ...(line.installmentGroup ? { installmentGroup: line.installmentGroup } : {}),
              ...(line.suggestedCategoryId ? { suggestedCategoryId: line.suggestedCategoryId } : {}),
              ...(line.suggestedCategoryName
                ? { suggestedCategoryName: line.suggestedCategoryName }
                : {}),
              ...(line.categoryConfidence ? { categoryConfidence: line.categoryConfidence } : {}),
            },
          },
        });

        imported += 1;
      } catch {
        failed += 1;
      }
    }
  });

  return NextResponse.json(importConfirmResponseSchema.parse({ imported, skippedDuplicates, failed }));
}

