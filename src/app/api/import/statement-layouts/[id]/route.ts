import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatementLayoutTrainingService } from "@/modules/statement-layout-training/application/services/statement-layout-training.service";

const patchSchema = z
  .object({
    layoutLabel: z.string().min(1).optional(),
    accountType: z.string().nullable().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .strict();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = new StatementLayoutTrainingService(prisma);
  const ok = await service.updateModel(session.user.id, id, parsed.data);
  if (!ok) {
    return NextResponse.json({ error: "Modelo não encontrado" }, { status: 404 });
  }

  const item = (await service.listModels(session.user.id)).find((m: { id: string }) => m.id === id);
  return NextResponse.json({ item });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const service = new StatementLayoutTrainingService(prisma);
  const ok = await service.deleteModel(session.user.id, id);
  if (!ok) {
    return NextResponse.json({ error: "Modelo não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
