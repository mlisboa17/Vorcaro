import { Suspense } from "react";
import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TransactionListTable, type TransactionListItemData } from "@/modules/transactions/components/transaction-list-table";
import { TransactionSummaryCards } from "@/modules/transactions/components/transaction-summary-cards";
import { getTransactions } from "@/modules/transactions/actions/get-transactions";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function readStringParam(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readPageParam(value: string | string[] | undefined): number {
  if (typeof value !== "string") return 1;
  const parsed = parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

export default async function TransactionsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const userId = session.user.id;
  const currentPage = readPageParam(searchParams.page);

  const accountId = readStringParam(searchParams.accountId);
  const categoryId = readStringParam(searchParams.categoryId);
  const search = readStringParam(searchParams.search);
  const reviewRequired = readStringParam(searchParams.reviewRequired);

  const {
    transactions,
    totalCount,
    totalPages,
    accounts,
    categories,
    income,
    expense,
    balance
  } = await getTransactions({
    userId,
    page: currentPage,
    accountId,
    categoryId,
    search,
    reviewRequired,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Transações</h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe o seu fluxo de caixa e gerencie todas as suas despesas e receitas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/transactions/import"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Importar OFX/CSV
          </Link>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Novo Lançamento
          </button>
        </div>
      </header>

      <TransactionSummaryCards income={income} expense={expense} balance={balance} />

      <Suspense
        fallback={
          <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        }
      >
        <TransactionListTable
          transactions={transactions}
          page={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          accounts={accounts}
          categories={categories}
          filters={{
            search: search ?? "",
            accountId: accountId ?? "",
            categoryId: categoryId ?? "",
          }}
        />
      </Suspense>
    </div>
  );
}
