import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";
import { prisma } from "@/lib/prisma";
import { FinancialDocumentSuggestionError } from "@/modules/financial-documents/application/services/financial-document-suggestion.service";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const { suggestion } = buildFinancialDocumentServices(prisma);

  try {
    await suggestion.reject(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof FinancialDocumentSuggestionError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Falha ao rejeitar sugestão" }, { status: 500 });
  }
}
