import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createConsortiumSchema } from "@/lib/consortium/consortium-schemas";
import { buildConsortiumSummary, serializeConsortium } from "@/lib/consortium/serialize-consortium";
import { prisma } from "@/lib/prisma";
import { ConsortiumError, ConsortiumService } from "@/modules/consortium/application/consortium.service";

function handleError(error: unknown) {
  if (error instanceof ConsortiumError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
  const service = new ConsortiumService(prisma);
  const records = await service.list(session.user.id, { includeInactive });
  const items = records.map(serializeConsortium);

  return NextResponse.json({
    items,
    summary: buildConsortiumSummary(items),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createConsortiumSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (body && typeof body === "object" && "userId" in body) {
    return NextResponse.json({ error: "userId não pode ser enviado pelo cliente." }, { status: 400 });
  }

  try {
    const service = new ConsortiumService(prisma);
    const created = await service.create(session.user.id, parsed.data);
    return NextResponse.json(serializeConsortium(created), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
