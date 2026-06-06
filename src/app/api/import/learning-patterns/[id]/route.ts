import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { id } = await params;
  const { learning } = buildFinancialDocumentServices(prisma);
  const result = await learning.updatePattern(session.user.id, id, {
    categoryId: typeof body.categoryId === "string" ? body.categoryId : undefined,
    subcategoryId: typeof body.subcategoryId === "string" ? body.subcategoryId : undefined,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Padrão não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const { learning } = buildFinancialDocumentServices(prisma);
  const result = await learning.deletePattern(session.user.id, id);

  if (result.count === 0) {
    return NextResponse.json({ error: "Padrão não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
