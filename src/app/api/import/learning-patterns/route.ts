import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { learning } = buildFinancialDocumentServices(prisma);
  const items = await learning.listPatterns(session.user.id);
  return NextResponse.json({ items });
}
