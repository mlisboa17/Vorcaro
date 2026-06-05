import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { handleInboxSmartBatchExecute } from "@/lib/inbox/handle-inbox-smart-batch-execute";
import { prisma } from "@/lib/prisma";

const bodySchema = z
  .object({
    inboxItemIds: z.array(z.string().min(1)).min(1).max(200),
    recordFeedback: z.boolean().optional(),
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

  const owned = await prisma.financialInbox.findMany({
    where: {
      userId: session.user.id,
      id: { in: parsed.data.inboxItemIds },
    },
    select: { id: true },
  });

  const ownedIds = new Set(owned.map((item) => item.id));
  const unauthorized = parsed.data.inboxItemIds.filter((id) => !ownedIds.has(id));

  if (unauthorized.length > 0) {
    return NextResponse.json({ error: "Itens não encontrados" }, { status: 404 });
  }

  try {
    const result = await handleInboxSmartBatchExecute(
      prisma,
      session.user.id,
      parsed.data.inboxItemIds,
      { recordFeedback: parsed.data.recordFeedback },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[inbox/intelligence/smart-batch/execute]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
