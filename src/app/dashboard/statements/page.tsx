import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UnifiedReconciliation } from "@/components/statements/unified-reconciliation";
import { AiLearningsPanel } from "@/modules/ai/components/ai-learnings-panel";
import { LayoutTrainingPanel } from "@/modules/statements/components/layout-training-panel";
import { InvoiceImportWizard } from "@/components/statements/invoice-import-wizard";
import type { FinanceCatalog } from "@/types/inbox";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function StatementsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const userId = session.user.id;
  const tenantDb = getTenantPrisma(userId);
  const params = await searchParams;
  const activeTab = params.tab || "import";

  // Fetch data in parallel under multitenant isolation
  const [pendingSuggestions, categories, accounts, previousImports, cards, aliases] = await Promise.all([
    tenantDb.statementLineSuggestion.findMany({
      where: { processed: false },
      orderBy: { date: "asc" },
    }).catch(() => []),
    tenantDb.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    tenantDb.financialAccount.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    tenantDb.bankStatementImport.findMany({
      include: {
        account: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    tenantDb.card.findMany({
      where: { userId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, institutionName: true, brand: true, type: true, lastFourDigits: true, financialAccountId: true },
    }),
    tenantDb.counterpartyAlias.findMany({
      where: {
        counterparty: {
          userId,
        },
      },
      include: {
        counterparty: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Map to matching types for the client component
  const formattedSuggestions = pendingSuggestions.map((s) => ({
    id: s.id,
    description: s.description,
    amount: Number(s.amount),
    date: s.date,
    cnpjCpf: s.cnpjCpf,
    suggestedName: s.suggestedName,
    originId: s.originId,
    destinationId: s.destinationId,
    score: s.score,
    status: s.status,
    reconciliationMatchId: s.reconciliationMatchId,
  }));

  const catalog: FinanceCatalog = {
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, type: "CHECKING", institutionName: null })),
    categories: categories.map((c) => ({ id: c.id, name: c.name, type: "DESPESA" })),
    paymentMethods: [],
    cards: cards.map((c) => ({
      id: c.id,
      name: c.name,
      brand: c.brand ?? "",
      type: c.type,
      institutionName: c.institutionName ?? null,
      lastFourDigits: c.lastFourDigits ?? null,
    })),
  };

  const formattedHistory = previousImports.map((imp) => ({
    id: imp.id,
    fileName: imp.fileName,
    status: imp.status,
    transactionsCount: imp.transactionsCount,
    createdAt: imp.createdAt,
    account: {
      name: imp.account.name,
    },
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
          Central de Conciliação Bancária & Cartões
        </h1>
        <p className="text-xs text-slate-500">
          Gerencie a importação de seus extratos e realize a conciliação manual rápida das linhas importadas.
        </p>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-6" aria-label="Tabs">
          {[
            { id: "import", label: "Importar" },
            { id: "import-review", label: "Conciliação" },
            { id: "ai-insights", label: "Insights da IA" },
            { id: "layout-training", label: "Treinamento da IA" },
          ].map((tab) => (
            <Link
              key={tab.id}
              href={`?tab=${tab.id}`}
              className={`border-b-2 py-2.5 px-1 text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        }
      >
        {activeTab === "layout-training" ? (
          <LayoutTrainingPanel />
        ) : activeTab === "ai-insights" ? (
          <AiLearningsPanel aliases={aliases} />
        ) : activeTab === "import-review" ? (
          <UnifiedReconciliation
            initialLines={formattedSuggestions}
            categories={categories}
            accounts={accounts}
            history={formattedHistory}
          />
        ) : (
          <InvoiceImportWizard catalog={catalog} />
        )}
      </Suspense>
    </div>
  );
}
