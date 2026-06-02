import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateConsortiumSchema } from "@/lib/consortium/consortium-schemas";
import { serializeConsortium } from "@/lib/consortium/serialize-consortium";
import { prisma } from "@/lib/prisma";
import { ConsortiumError, ConsortiumService } from "@/modules/consortium/application/consortium.service";

function handleError(error: unknown) {
  if (error instanceof ConsortiumError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateConsortiumSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (body && typeof body === "object" && "userId" in body) {
    return NextResponse.json({ error: "userId não pode ser enviado pelo cliente." }, { status: 400 });
  }

  try {
    const service = new ConsortiumService(prisma);
    const updated = await service.update(id, session.user.id, parsed.data);
    return NextResponse.json(serializeConsortium(updated));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const service = new ConsortiumService(prisma);
    const deleted = await service.softDelete(id, session.user.id);
    return NextResponse.json(serializeConsortium(deleted));
  } catch (error) {
    return handleError(error);
  }
}
