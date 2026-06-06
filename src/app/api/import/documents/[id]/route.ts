import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const { repo } = buildFinancialDocumentServices(prisma);
  const document = await repo.findDocumentById(session.user.id, id);
  if (!document) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  return NextResponse.json(document);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  if (body?.status !== "REJECTED") {
    return NextResponse.json({ error: "Operação não suportada" }, { status: 400 });
  }

  const { id } = await params;
  const { repo } = buildFinancialDocumentServices(prisma);
  const document = await repo.findDocumentById(session.user.id, id);
  if (!document) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  if (document.status === "APPROVED") {
    return NextResponse.json({ error: "Documento aprovado não pode ser rejeitado" }, { status: 422 });
  }

  const updated = await repo.updateDocument(id, { status: "REJECTED" });
  return NextResponse.json(updated);
}
