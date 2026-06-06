import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";
import { prisma } from "@/lib/prisma";
import { FinancialDocumentProcessingError } from "@/modules/financial-documents/application/errors/financial-document-processing.error";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const { id } = await params;
  const { reprocess } = buildFinancialDocumentServices(prisma);

  try {
    const result = await reprocess.reprocess(session.user.id, id, {
      pdfPassword: typeof body.password === "string" ? body.password : undefined,
    });

    if (!result) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof FinancialDocumentProcessingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    }
    console.error("[import/documents/reprocess]", error);
    return NextResponse.json({ error: "Falha ao reprocessar documento" }, { status: 500 });
  }
}
