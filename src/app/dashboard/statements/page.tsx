import { Suspense } from "react";
import Link from "next/link";
import { Loader2, FileUp, List, FileText, History, GraduationCap, ClipboardCheck } from "lucide-react";

import { TransactionsDashboard } from "@/components/transactions/transactions-dashboard";
import { ImportDashboard } from "@/components/financial-documents/import-dashboard";
import { StatementLayoutTrainingDashboard } from "@/components/financial-documents/statement-layout-training-dashboard";
import { RealBankHomologationDashboard } from "@/components/financial-documents/real-bank-homologation-dashboard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ImportReviewList } from "@/modules/statements/components/import-review-list";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StatementsPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const currentTab = typeof searchParams.tab === "string" ? searchParams.tab : "overview";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Extratos & Importação</h1>
        <p className="text-slate-500">
          Gerencie seus lançamentos manuais ou importe extratos OFX/CSV/PDF.
        </p>
      </div>

      {/* Tabs Customizadas - Baseado em Tailwind/Shadcn */}
      <div className="inline-flex h-10 items-center justify-center rounded-md bg-slate-100 p-1 text-slate-500 flex-wrap gap-1 md:flex-nowrap">
        <Link
          href="/dashboard/statements?tab=overview"
          prefetch={true}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
            currentTab === "overview"
              ? "bg-white text-slate-950 shadow-sm"
              : "hover:text-slate-900"
          }`}
        >
          <List className="mr-2 h-4 w-4" />
          Visão Geral (Extratos)
        </Link>
        <Link
          href="/dashboard/statements?tab=import"
          prefetch={true}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
            currentTab === "import"
              ? "bg-white text-slate-950 shadow-sm"
              : "hover:text-slate-900"
          }`}
        >
          <FileUp className="mr-2 h-4 w-4" />
          Upload (OFX / CSV / PDF)
        </Link>
        <Link
          href="/dashboard/statements?tab=import-review"
          prefetch={true}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
            currentTab === "import-review"
              ? "bg-white text-slate-950 shadow-sm"
              : "hover:text-slate-900"
          }`}
        >
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Revisão de Importações
        </Link>
        <Link
          href="/dashboard/statements?tab=import-history"
          prefetch={true}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
            currentTab === "import-history"
              ? "bg-white text-slate-950 shadow-sm"
              : "hover:text-slate-900"
          }`}
        >
          <History className="mr-2 h-4 w-4" />
          Histórico
        </Link>
        <Link
          href="/dashboard/statements?tab=layout-training"
          prefetch={true}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
            currentTab === "layout-training"
              ? "bg-white text-slate-950 shadow-sm"
              : "hover:text-slate-900"
          }`}
        >
          <GraduationCap className="mr-2 h-4 w-4" />
          Treinamento de Modelos
        </Link>
        <Link
          href="/dashboard/statements?tab=layout-training-homologation"
          prefetch={true}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
            currentTab === "layout-training-homologation"
              ? "bg-white text-slate-950 shadow-sm"
              : "hover:text-slate-900"
          }`}
        >
          <FileText className="mr-2 h-4 w-4" />
          Homologação Real
        </Link>
      </div>

      <div className="mt-6">
        {currentTab === "overview" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
            <Suspense
              fallback={
                <div className="flex min-h-[50vh] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              }
            >
              <TransactionsDashboard />
            </Suspense>
          </div>
        )}

        {currentTab === "import" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
            <Suspense
              fallback={
                <div className="flex min-h-[40vh] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              }
            >
              <ImportDashboard mode="upload" />
            </Suspense>
          </div>
        )}

        {currentTab === "import-review" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
            <Suspense
              fallback={
                <div className="flex min-h-[40vh] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              }
            >
              {(() => {
                // Roda as queries no escopo do componente para manter compatibilidade com renderização parcial
                return (
                  <ImportReviewWrapper />
                );
              })()}
            </Suspense>
          </div>
        )}

        {currentTab === "import-history" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
            <Suspense
              fallback={
                <div className="flex min-h-[40vh] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              }
            >
              <ImportDashboard mode="history" />
            </Suspense>
          </div>
        )}

        {currentTab === "layout-training" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
            <Suspense
              fallback={
                <div className="flex min-h-[40vh] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              }
            >
              <StatementLayoutTrainingDashboard />
            </Suspense>
          </div>
        )}

        {currentTab === "layout-training-homologation" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
            <Suspense
              fallback={
                <div className="flex min-h-[40vh] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              }
            >
              <RealBankHomologationDashboard />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}

async function ImportReviewWrapper() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const pendingSuggestions = await prisma.statementLineSuggestion.findMany({
    where: {
      userId: session.user.id,
      processed: false,
    },
    orderBy: {
      date: "asc",
    },
  });

  const formattedLines = pendingSuggestions.map((s) => ({
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

  return <ImportReviewList initialLines={formattedLines} />;
}


