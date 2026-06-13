import { Suspense } from "react";
import Link from "next/link";
import { Loader2, FileUp, List } from "lucide-react";

import { TransactionsDashboard } from "@/components/transactions/transactions-dashboard";
import { ImportDashboard } from "@/components/financial-documents/import-dashboard";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StatementsPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const currentTab = typeof searchParams.tab === "string" ? searchParams.tab : "overview";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Extratos & Importação</h1>
        <p className="text-slate-500">
          Gerencie seus lançamentos manuais ou importe extratos OFX/CSV.
        </p>
      </div>

      {/* Tabs Customizadas - Baseado em Tailwind/Shadcn */}
      <div className="inline-flex h-10 items-center justify-center rounded-md bg-slate-100 p-1 text-slate-500">
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
          Importação OFX / CSV
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
      </div>
    </div>
  );
}
