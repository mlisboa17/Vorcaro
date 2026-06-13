import React from "react";
import { ImportStatementZone } from "@/modules/transactions/components/import-statement-zone";
import { auth } from "@/lib/auth";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Importar Extrato | Logos Financeiro",
  description: "Faça upload de arquivos OFX e CSV para conciliação bancária.",
};

export default async function ImportStatementPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const prisma = getTenantPrisma(session.user.id);

  // Busca as contas ativas do usuário para popular o select
  const accounts = await prisma.financialAccount.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="container max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-neutral-200/60 bg-white/60 px-6 py-12 shadow-xl backdrop-blur-xl dark:border-neutral-800/60 dark:bg-neutral-950/60 sm:px-12 sm:py-16">
        <ImportStatementZone accounts={accounts} />
      </div>
    </div>
  );
}
