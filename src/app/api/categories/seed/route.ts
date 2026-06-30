import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seedCategoryTaxonomyForUser, formatSeedCategoryTaxonomyReport } from "@/lib/categories/seed-category-taxonomy";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const report = await seedCategoryTaxonomyForUser(prisma, session.user.id);

  return NextResponse.json({
    message: formatSeedCategoryTaxonomyReport(report),
    ...report,
  });
}
