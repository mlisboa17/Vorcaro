import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import RulesClient from "./RulesClient";

export const metadata = {
  title: "Regras de Categorização | Vorcaro",
  description: "Gerencie as regras de categorização automática das suas transações.",
};

export default async function AutomationRulesPage() {
  const session = await auth();
  if (!session?.user?.id) return redirect("/login");

  const rules = await prisma.transactionRule.findMany({
    where: { userId: session.user.id },
    include: { 
      targetCategory: {
        select: { id: true, name: true, color: true }
      } 
    },
    orderBy: { priority: "desc" },
  });

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id, isActive: true },
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <RulesClient rules={rules} categories={categories} />
    </div>
  );
}
