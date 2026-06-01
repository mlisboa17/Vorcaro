import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MOCK_FINANCE_CATALOG } from "@/lib/mocks/finance-catalog";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [accounts, categoriesRaw, paymentMethods, cards] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { userId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        institutionName: true,
        type: true,
        currency: true,
      },
    }),
    prisma.category.findMany({
      where: { userId, isActive: true },
      orderBy: [{ parentCategoryId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        parentCategoryId: true,
      },
    }),
    prisma.paymentMethod.findMany({
      where: { userId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true, isDefault: true },
    }),
    prisma.card.findMany({
      where: { userId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        institutionName: true,
        brand: true,
        type: true,
        lastFourDigits: true,
        financialAccountId: true,
      },
    }),
  ]);

  if (
    accounts.length === 0 &&
    categoriesRaw.length === 0 &&
    paymentMethods.length === 0 &&
    cards.length === 0
  ) {
    return NextResponse.json(MOCK_FINANCE_CATALOG);
  }

  const categories = categoriesRaw.map((category) => ({
    id: category.id,
    name: category.name,
    type: category.type,
    parentCategoryId: category.parentCategoryId,
  }));

  return NextResponse.json({ accounts, categories, paymentMethods, cards });
}
