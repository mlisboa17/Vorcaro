import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";
import { prisma } from "@/lib/prisma";
import {
  FinancialDocumentSuggestionError,
} from "@/modules/financial-documents/application/services/financial-document-suggestion.service";

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
  const { suggestion } = buildFinancialDocumentServices(prisma);

  try {
    const updated = await suggestion.edit(session.user.id, id, {
      amount: typeof body.amount === "number" ? body.amount : undefined,
      date: typeof body.date === "string" ? body.date : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      supplier: typeof body.supplier === "string" ? body.supplier : undefined,
      categoryId: typeof body.categoryId === "string" ? body.categoryId : undefined,
      subcategoryId: typeof body.subcategoryId === "string" ? body.subcategoryId : undefined,
      accountId: typeof body.accountId === "string" ? body.accountId : undefined,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof FinancialDocumentSuggestionError) {
      return NextResponse.json({ error: error.message }, { status: error.code === "NOT_FOUND" ? 404 : 400 });
    }
    return NextResponse.json({ error: "Falha ao editar sugestão" }, { status: 500 });
  }
}
