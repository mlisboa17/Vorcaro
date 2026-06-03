import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleInboxBulkConfirm } from "@/lib/inbox/handle-inbox-bulk-confirm";
import { prisma } from "@/lib/prisma";
import { inboxBulkConfirmApiSchema } from "@/modules/financial-inbox/domain/schemas/inbox-bulk-confirm-api.schema";

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

  const parsed = inboxBulkConfirmApiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await handleInboxBulkConfirm(
      prisma,
      session.user.id,
      parsed.data.inboxItemIds,
    );

    return NextResponse.json({
      confirmed: result.confirmed,
      confirmedIds: result.confirmedIds,
      skipped: result.skipped,
      skippedIds: result.skippedIds,
      failed: result.failed,
      failedItems: result.failedItems,
    });
  } catch (error) {
    console.error("[inbox/bulk-confirm]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
