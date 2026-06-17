import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UnifiedReconciliation } from "@/components/statements/unified-reconciliation";
import { AiLearningsPanel } from "@/modules/ai/components/ai-learnings-panel";
import { LayoutTrainingPanel } from "@/modules/statements/components/layout-training-panel";

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
  const activeTab = params.tab || "import-review";

  // Fetch data in parallel under multitenant isolation
  const [pendingSuggestions, categories, accounts, previousImports, aliases] = await Promise.all([
    tenantDb.statementLineSuggestion.findMany({
      where: { processed: false },
      orderBy: { date: "asc" },
    }),
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

      {/* SAP FIORI HORIZON STYLED TABS */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-6" aria-label="Tabs">
          <Link
            href="?tab=import-review"
            className={`border-b-2 py-2.5 px-1 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "import-review"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            Central de Conciliação
          </Link>
          <Link
            href="?tab=ai-insights"
            className={`border-b-2 py-2.5 px-1 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "ai-insights"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            Insights da IA
          </Link>
          <Link
            href="?tab=layout-training"
            className={`border-b-2 py-2.5 px-1 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "layout-training"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            Treinamento da IA
          </Link>
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
        ) : (
          <UnifiedReconciliation
            initialLines={formattedSuggestions}
            categories={categories}
            accounts={accounts}
            history={formattedHistory}
          />
        )}
      </Suspense>
    </div>
  );
}
