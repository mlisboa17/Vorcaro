import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { handleInboxBulkApplySuggestions } from "@/lib/inbox/handle-inbox-bulk-apply-suggestions";
import { prisma } from "@/lib/prisma";

const bodySchema = z
  .object({
    inboxItemIds: z.array(z.string().min(1)).min(1).max(200),
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

  try {
    const result = await handleInboxBulkApplySuggestions(
      prisma,
      session.user.id,
      parsed.data.inboxItemIds,
    );

    return NextResponse.json({
      applied: result.applied,
      skipped: result.skipped,
      failed: result.failed,
      failedItems: result.failedItems,
    });
  } catch (error) {
    console.error("[inbox/bulk-apply-suggestions]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
