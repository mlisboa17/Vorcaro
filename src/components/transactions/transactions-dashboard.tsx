"use client";

import type { FinanceCatalog, PeriodPreset, TransactionListResponse } from "@/types/transactions";
import type { TransactionListItem } from "@/types/transactions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { parsePeriodPreset } from "@/lib/utils/date-periods";
import {
  TransactionBalanceCards,
  TransactionBalanceCardsSkeleton,
  TransactionEmptyBalanceHint,
} from "./transaction-balance-cards";
import { TransactionFilters } from "./transaction-filters";
import { TransactionTable } from "./transaction-table";
import { EditTransactionModal } from "./edit-transaction-modal";
import { DeleteTransactionModal } from "./delete-transaction-modal";

const PAGE_SIZE = 50;

export function TransactionsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const accountId = searchParams.get("accountId") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const period = parsePeriodPreset(searchParams.get("period"));

  const [data, setData] = useState<TransactionListResponse | null>(null);
  const [catalog, setCatalog] = useState<FinanceCatalog>({
    accounts: [],
    categories: [],
    paymentMethods: [],
    cards: [],
  });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<TransactionListItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<TransactionListItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (accountId) {
      params.set("accountId", accountId);
    }

    if (categoryId) {
      params.set("categoryId", categoryId);
    }

    params.set("period", period);
    params.set("limit", String(PAGE_SIZE));

    return params.toString();
  }, [accountId, categoryId, period]);

  const fetchTransactions = useCallback(async () => {
    const response = await fetch(`/api/transactions?${queryString}`, {
      credentials: "include",
    });

    if (response.status === 401) {
      setAuthError(true);
      return;
    }

    if (!response.ok) {
      throw new Error("Falha ao carregar o extrato");
    }

    const payload = (await response.json()) as TransactionListResponse;
    setData(payload);
    setAuthError(false);
  }, [queryString]);

  const fetchCatalog = useCallback(async () => {
    const response = await fetch("/api/finance/catalog", { credentials: "include" });

    if (response.ok) {
      const payload = (await response.json()) as FinanceCatalog;
      setCatalog(payload);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTransactions(), fetchCatalog()])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fetchTransactions, fetchCatalog]);

  function updateFilters(next: {
    accountId?: string;
    categoryId?: string;
    period?: PeriodPreset;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    const nextAccountId = next.accountId ?? accountId;
    const nextCategoryId = next.categoryId ?? categoryId;
    const nextPeriod = next.period ?? period;

    if (nextAccountId) {
      params.set("accountId", nextAccountId);
    } else {
      params.delete("accountId");
    }

    if (nextCategoryId) {
      params.set("categoryId", nextCategoryId);
    } else {
      params.delete("categoryId");
    }

    params.set("period", nextPeriod);

    router.push(`/dashboard/transactions?${params.toString()}`);
  }

  function handleEdit(item: TransactionListItem) {
    setEditingItem(item);
    setEditOpen(true);
  }

  function handleDeleteRequest(item: TransactionListItem) {
    setDeletingItem(item);
    setDeleteOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deletingItem) {
      return;
    }

    const transactionId = deletingItem.id;
    const description = deletingItem.description;

    setDeletingId(transactionId);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Falha ao excluir lançamento");
      }

      const result = (await response.json()) as {
        restoredInboxStatus: string | null;
      };

      if (result.restoredInboxStatus) {
        setActionMessage(
          `Lançamento "${description}" excluído. Item da Caixa Financeira restaurado para ${result.restoredInboxStatus === "NEEDS_CONFIRMATION" ? "Revisão" : "Pronto"}.`,
        );
      } else {
        setActionMessage(`Lançamento "${description}" excluído com sucesso.`);
      }

      setDeleteOpen(false);
      setDeletingItem(null);
      await fetchTransactions();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      setActionMessage(message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSavedEdit() {
    setActionMessage("Lançamento atualizado com sucesso.");
    await fetchTransactions();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Extrato Financeiro</h1>
        </header>
        <TransactionBalanceCardsSkeleton />
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-amber-900">Autenticação necessária</h2>
        <p className="mt-2 text-sm text-amber-800">
          Faça login com <code className="rounded bg-amber-100 px-1">dev@logos.local</code> para
          acessar o extrato.
        </p>
        <a
          href="/api/auth/signin"
          className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Entrar
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Extrato Financeiro</h1>
          <p className="mt-1 text-sm text-slate-500">
            Livro-caixa consolidado — transações confirmadas e saldo da conta principal.
          </p>
        </div>
      </header>

      {data?.summary && <TransactionBalanceCards summary={data.summary} />}

      <TransactionFilters
        catalog={catalog}
        accountId={accountId}
        categoryId={categoryId}
        period={period}
        onAccountChange={(value) => updateFilters({ accountId: value })}
        onCategoryChange={(value) => updateFilters({ categoryId: value })}
        onPeriodChange={(value) => updateFilters({ period: value })}
      />

      {actionMessage && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {actionMessage}
        </div>
      )}

      {data && data.items.length === 0 ? <TransactionEmptyBalanceHint /> : null}

      {data && data.items.length > 0 ? (
        <>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              {data.total} {data.total === 1 ? "lançamento" : "lançamentos"}
            </span>
            <span>{data.summary.periodLabel}</span>
          </div>

          <TransactionTable
            items={data.items}
            deletingId={deletingId}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
          />
        </>
      ) : null}

      <EditTransactionModal
        item={editingItem}
        catalog={catalog}
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditingItem(null);
        }}
        onSaved={handleSavedEdit}
      />

      <DeleteTransactionModal
        item={deletingItem}
        open={deleteOpen}
        deleting={deletingId === deletingItem?.id}
        onClose={() => {
          if (deletingId) {
            return;
          }
          setDeleteOpen(false);
          setDeletingItem(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
