import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InboxClassificationService } from "@/modules/inbox-intelligence/application/services/inbox-classification.service";
import { parseInboxImportLineMetadata } from "@/modules/financial-inbox/domain/schemas/inbox-import-metadata.schema";
import { parseFinancialExtraction } from "@/modules/financial-inbox/domain/schemas/financial-extraction.schema";

const bodySchema = z
  .object({
    inboxItemIds: z.array(z.string().min(1)).min(1).max(100),
  })
  .strict();

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const items = await prisma.financialInbox.findMany({
    where: { userId: session.user.id, id: { in: parsed.data.inboxItemIds } },
    select: {
      id: true,
      rawContent: true,
      importHash: true,
      metadata: true,
      extractionResults: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { extractedData: true },
      },
    },
  });

  const classifier = new InboxClassificationService(prisma);
  const suggestions = await classifier.classifyBatch({
    userId: session.user.id,
    items: items.map((item) => {
      const meta = parseInboxImportLineMetadata(item.metadata);
      const extraction = item.extractionResults[0]?.extractedData
        ? parseFinancialExtraction(item.extractionResults[0].extractedData)
        : null;

      return {
        inboxItemId: item.id,
        description: extraction?.description ?? item.rawContent,
        rawContent: item.rawContent,
        amount: extraction?.amount ?? meta?.amount ?? null,
        date: extraction?.date ?? meta?.date ?? meta?.dataCompra ?? null,
        cardId: extraction?.cardId ?? meta?.cartaoId ?? null,
        importHash: item.importHash ?? meta?.importHash ?? null,
      };
    }),
  });

  return NextResponse.json({ suggestions });
}
