import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleInboxBulkUpdate, BatchInboxError } from "@/lib/inbox/handle-inbox-bulk-update";
import { prisma } from "@/lib/prisma";
import { inboxBulkUpdateApiSchema } from "@/modules/financial-inbox/domain/schemas/inbox-bulk-update-api.schema";

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

  const parsed = inboxBulkUpdateApiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await handleInboxBulkUpdate(
      prisma,
      session.user.id,
      parsed.data.inboxItemIds,
      parsed.data.patch,
    );

    return NextResponse.json({
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
    });
  } catch (error) {
    if (error instanceof BatchInboxError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("[inbox/bulk-update]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
