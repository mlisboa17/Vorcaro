import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";
import { prisma } from "@/lib/prisma";
import { FinancialDocumentProcessingError } from "@/modules/financial-documents/application/errors/financial-document-processing.error";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const { reprocess } = buildFinancialDocumentServices(prisma);

  try {
    const result = await reprocess.reopen(session.user.id, id);
    if (!result) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof FinancialDocumentProcessingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    }
    console.error("[import/documents/reopen]", error);
    return NextResponse.json({ error: "Falha ao reabrir documento" }, { status: 500 });
  }
}
