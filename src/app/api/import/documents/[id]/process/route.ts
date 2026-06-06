import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const { repo, processing } = buildFinancialDocumentServices(prisma);
  const document = await repo.findDocumentById(session.user.id, id);
  if (!document) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  try {
    const result = await processing.process(session.user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[import/documents/process]", error);
    return NextResponse.json({ error: "Falha ao processar documento" }, { status: 500 });
  }
}
