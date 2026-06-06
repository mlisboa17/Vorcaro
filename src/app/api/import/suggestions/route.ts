import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";
import { prisma } from "@/lib/prisma";
import { enrichSuggestions } from "@/modules/financial-documents/application/services/financial-document-suggestion-presenter.service";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const { repo } = buildFinancialDocumentServices(prisma);
  let items = await repo.listSuggestions(session.user.id, status as never, 100);
  if (status === "PENDING") {
    const edited = await repo.listSuggestions(session.user.id, "EDITED", 100);
    items = [...items, ...edited];
  }
  const enriched = await enrichSuggestions(prisma, session.user.id, items);
  return NextResponse.json({ items: enriched });
}
