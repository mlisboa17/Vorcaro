"use client";

import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, FileSearch, Search, Paperclip } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export type TransactionListItemData = {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: Date;
  accountName: string | null;
  categoryName: string | null;
  reviewRequired?: boolean;
  mediaUrl?: string;
};

type AccountOption = { id: string; name: string };
type CategoryOption = { id: string; name: string };

type TransactionFilters = {
  search: string;
  accountId: string;
  categoryId: string;
};

type Props = {
  transactions: TransactionListItemData[];
  page: number;
  totalPages: number;
  totalCount: number;
  accounts: AccountOption[];
  categories: CategoryOption[];
  filters: TransactionFilters;
};

function buildTransactionsHref(filters: TransactionFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.accountId) params.set("accountId", filters.accountId);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/dashboard/transactions?${qs}` : "/dashboard/transactions";
}

function TransactionListFilters({
  accounts,
  categories,
  filters,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  filters: TransactionFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(filters.search);

  useEffect(() => {
    setSearchValue(filters.search);
  }, [filters.search]);

  const updateFilters = useCallback(
    (updates: Partial<TransactionFilters>) => {
      const params = new URLSearchParams(searchParams.toString());
      const next: TransactionFilters = {
        search: updates.search ?? filters.search,
        accountId: updates.accountId ?? filters.accountId,
        categoryId: updates.categoryId ?? filters.categoryId,
      };

      if (next.search.trim()) params.set("search", next.search.trim());
      else params.delete("search");

      if (next.accountId) params.set("accountId", next.accountId);
      else params.delete("accountId");

      if (next.categoryId) params.set("categoryId", next.categoryId);
      else params.delete("categoryId");

      params.delete("page");

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams, filters]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchValue });
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:max-w-xs">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Buscar descrição..."
          className="block w-full rounded-lg border-0 py-2 pl-10 pr-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 sm:text-sm sm:leading-6"
        />
        <button type="submit" className="hidden">
          Buscar
        </button>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={filters.accountId}
          onChange={(e) => updateFilters({ accountId: e.target.value })}
          className="block w-full rounded-lg border-0 py-2 pl-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-slate-900 sm:max-w-xs sm:text-sm sm:leading-6"
        >
          <option value="">Todas as Contas</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>

        <select
          value={filters.categoryId}
          onChange={(e) => updateFilters({ categoryId: e.target.value })}
          className="block w-full rounded-lg border-0 py-2 pl-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-slate-900 sm:max-w-xs sm:text-sm sm:leading-6"
        >
          <option value="">Todas as Categorias</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

import { getTransactionFileUrl } from "../actions/get-transaction-file-url";

export function TransactionListTable({
  transactions,
  page,
  totalPages,
  totalCount,
  accounts,
  categories,
  filters,
}: Props) {
  const prevHref = buildTransactionsHref(filters, page > 1 ? page - 1 : 1);
  const nextHref = buildTransactionsHref(filters, page < totalPages ? page + 1 : totalPages);

  return (
    <div className="flex flex-col gap-4">
      <TransactionListFilters accounts={accounts} categories={categories} filters={filters} />

      {transactions.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200">
            <FileSearch className="h-6 w-6 text-slate-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">Nenhuma transação encontrada</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Seu extrato está vazio ou nenhum resultado corresponde aos filtros aplicados.
          </p>
          <Link
            href="/dashboard/transactions/import"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Importar Extrato
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Conta</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => {
                  const isExpense = tx.type === "EXPENSE" || tx.amount < 0;
                  const absAmount = Math.abs(tx.amount);

                  return (
                    <tr key={tx.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                        {new Intl.DateTimeFormat("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }).format(new Date(tx.date))}
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2 font-medium text-slate-800">
                          {tx.description}
                          {tx.reviewRequired && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                              Revisão Necessária
                            </span>
                          )}
                          {tx.mediaUrl && (
                            <button
                              onClick={async () => {
                                try {
                                  const signedUrl = await getTransactionFileUrl(tx.mediaUrl!);
                                  window.open(signedUrl, "_blank");
                                } catch (error) {
                                  console.error("Erro ao gerar URL", error);
                                  alert("Não foi possível carregar o anexo.");
                                }
                              }}
                              className="inline-flex items-center justify-center rounded bg-slate-100 p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                              title="Ver Comprovante Original"
                            >
                              <Paperclip className="h-4 w-4" />
                            </button>
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-500">{tx.accountName ?? "—"}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {tx.categoryName ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            {tx.categoryName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                            Sem Categoria
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isExpense ? (
                            <ArrowDownCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                          )}
                          <span className={`font-semibold ${isExpense ? "text-red-600" : "text-emerald-600"}`}>
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(absAmount)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalCount > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-500">
            Página <span className="font-medium text-slate-900">{page}</span> de{" "}
            <span className="font-medium text-slate-900">{totalPages}</span>
            {totalCount > 0 ? (
              <>
                {" "}
                · <span className="font-medium text-slate-900">{totalCount}</span> transações
              </>
            ) : null}
          </p>
          <div className="flex gap-2">
            <Link
              href={prevHref}
              aria-disabled={page <= 1}
              className={`inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 ${
                page <= 1 ? "pointer-events-none opacity-50" : "text-slate-700"
              }`}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Anterior
            </Link>
            <Link
              href={nextHref}
              aria-disabled={page >= totalPages}
              className={`inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 ${
                page >= totalPages ? "pointer-events-none opacity-50" : "text-slate-700"
              }`}
            >
              Próxima
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
