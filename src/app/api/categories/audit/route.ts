import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategoryTaxonomyAuditService } from "@/modules/categories/application/services/category-taxonomy-audit.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const service = new CategoryTaxonomyAuditService(prisma);
  const report = await service.audit(session.user.id);

  return NextResponse.json(report);
}
