"use client";

import type { FinanceCatalog, PeriodPreset, TransactionListResponse } from "@/types/transactions";
import type { TransactionListItem } from "@/types/transactions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { CreateTransactionModal } from "./create-transaction-modal";
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
import { TransactionBulkSelectionBar } from "./transaction-bulk-selection-bar";
import { BulkEditTransactionsModal } from "./bulk-edit-transactions-modal";
import { BulkDeleteTransactionsModal } from "./bulk-delete-transactions-modal";
import { SettingsToastProvider, useSettingsToast } from "@/components/settings/settings-toast";

const PAGE_SIZE = 50;

function TransactionsDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useSettingsToast();

  const accountId = searchParams.get("accountId") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const period = parsePeriodPreset(searchParams.get("period"));
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const offset = Math.max(0, Number(searchParams.get("offset") ?? "0") || 0);

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
  const [createOpen, setCreateOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectingFiltered, setSelectingFiltered] = useState(false);

  const filterQueryString = useMemo(() => {
    const params = new URLSearchParams();

    if (accountId) {
      params.set("accountId", accountId);
    }

    if (categoryId) {
      params.set("categoryId", categoryId);
    }

    params.set("period", period);

    if (period === "custom") {
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
    }

    return params.toString();
  }, [accountId, categoryId, period, startDate, endDate]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams(filterQueryString);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));
    return params.toString();
  }, [filterQueryString, offset]);

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

  useEffect(() => {
    setSelectedIds(new Set());
  }, [queryString]);

  function updateFilters(next: {
    accountId?: string;
    categoryId?: string;
    period?: PeriodPreset;
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    const nextAccountId = next.accountId ?? accountId;
    const nextCategoryId = next.categoryId ?? categoryId;
    const nextPeriod = next.period ?? period;
    const nextStartDate = next.startDate !== undefined ? next.startDate : startDate;
    const nextEndDate = next.endDate !== undefined ? next.endDate : endDate;

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

    if (nextPeriod === "custom") {
      if (nextStartDate) params.set("startDate", nextStartDate);
      if (nextEndDate) params.set("endDate", nextEndDate);
    } else {
      params.delete("startDate");
      params.delete("endDate");
    }

    params.delete("offset");

    router.push(`/dashboard/transactions?${params.toString()}`);
  }

  function goToPage(nextOffset: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("offset", String(Math.max(0, nextOffset)));
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

  const pageIds = useMemo(() => data?.items.map((item) => item.id) ?? [], [data?.items]);
  const pageAllSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const pageSomeSelected = pageIds.some((id) => selectedIds.has(id));
  const selectionMode = selectedIds.size > 0;

  const selectedItems = useMemo(
    () => data?.items.filter((item) => selectedIds.has(item.id)) ?? [],
    [data?.items, selectedIds],
  );

  const sampleSelectedItem = selectedItems[0] ?? null;

  function toggleRow(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function togglePage() {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (pageAllSelected) {
        for (const id of pageIds) {
          next.delete(id);
        }
      } else {
        for (const id of pageIds) {
          next.add(id);
        }
      }

      return next;
    });
  }

  async function selectFiltered() {
    setSelectingFiltered(true);

    try {
      const response = await fetch(`/api/transactions/ids?${filterQueryString}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Falha ao carregar lançamentos filtrados");
      }

      const payload = (await response.json()) as { ids: string[] };
      setSelectedIds(new Set(payload.ids));
      pushToast(
        "success",
        `${payload.ids.length} lançamentos filtrados selecionados.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      pushToast("error", message);
    } finally {
      setSelectingFiltered(false);
    }
  }

  async function handleBulkDeleteConfirm() {
    const ids = [...selectedIds];
    setBulkBusy(true);

    try {
      const response = await fetch("/api/transactions/bulk-delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionIds: ids }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Falha ao excluir lançamentos");
      }

      const result = (await response.json()) as { deletedCount: number };
      pushToast("success", `${result.deletedCount} lançamentos excluídos com sucesso.`);
      setBulkDeleteOpen(false);
      setSelectedIds(new Set());
      await fetchTransactions();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      pushToast("error", message);
    } finally {
      setBulkBusy(false);
    }
  }

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const canGoPrev = offset > 0;
  const canGoNext = offset + PAGE_SIZE < total;

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
    <div className={selectionMode ? "space-y-6 pb-28" : "space-y-6"}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Extrato Financeiro</h1>
          <p className="mt-1 text-sm text-slate-500">
            Livro-caixa consolidado — transações confirmadas e saldo da conta principal.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Novo lançamento
        </button>
      </header>

      {data?.summary && <TransactionBalanceCards summary={data.summary} />}

      <TransactionFilters
        catalog={catalog}
        accountId={accountId}
        categoryId={categoryId}
        period={period}
        startDate={startDate}
        endDate={endDate}
        onAccountChange={(value) => updateFilters({ accountId: value })}
        onCategoryChange={(value) => updateFilters({ categoryId: value })}
        onDateRangeChange={(range) => updateFilters({
          period: range.period,
          startDate: range.startDate,
          endDate: range.endDate
        })}
      />

      {actionMessage && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {actionMessage}
        </div>
      )}

      {data && data.items.length === 0 ? <TransactionEmptyBalanceHint /> : null}

      {data && data.items.length > 0 ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              <span>
                {data.total} {data.total === 1 ? "lançamento" : "lançamentos"}
              </span>
              <span className="mx-2 text-slate-300">·</span>
              <span>{data.summary.periodLabel}</span>
              {totalPages > 1 ? (
                <>
                  <span className="mx-2 text-slate-300">·</span>
                  <span>
                    Página {currentPage} de {totalPages}
                  </span>
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={togglePage}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {pageAllSelected ? "Desmarcar página" : "Selecionar página"}
              </button>
              <button
                type="button"
                onClick={() => void selectFiltered()}
                disabled={selectingFiltered}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {selectingFiltered ? (
                  <Loader2 className="inline h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Selecionar filtrados"
                )}
              </button>
            </div>
          </div>

          <TransactionTable
            items={data.items}
            deletingId={deletingId}
            selectedIds={selectedIds}
            selectionMode={selectionMode}
            pageAllSelected={pageAllSelected}
            pageSomeSelected={pageSomeSelected}
            onToggleRow={toggleRow}
            onTogglePage={togglePage}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
          />

          {totalPages > 1 ? (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => goToPage(offset - PAGE_SIZE)}
                disabled={!canGoPrev}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <button
                type="button"
                onClick={() => goToPage(offset + PAGE_SIZE)}
                disabled={!canGoNext}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <TransactionBulkSelectionBar
        selectedCount={selectedIds.size}
        busy={bulkBusy}
        onEdit={() => setBulkEditOpen(true)}
        onDelete={() => setBulkDeleteOpen(true)}
        onClear={() => setSelectedIds(new Set())}
      />

      <BulkEditTransactionsModal
        open={bulkEditOpen}
        selectedIds={[...selectedIds]}
        sampleItem={sampleSelectedItem}
        catalog={catalog}
        onClose={() => setBulkEditOpen(false)}
        onSaved={async (updatedCount) => {
          pushToast("success", `${updatedCount} lançamentos atualizados com sucesso.`);
          setSelectedIds(new Set());
          await fetchTransactions();
        }}
      />

      <BulkDeleteTransactionsModal
        open={bulkDeleteOpen}
        count={selectedIds.size}
        deleting={bulkBusy}
        onClose={() => {
          if (!bulkBusy) {
            setBulkDeleteOpen(false);
          }
        }}
        onConfirm={() => void handleBulkDeleteConfirm()}
      />

      <CreateTransactionModal
        open={createOpen}
        catalog={catalog}
        onClose={() => setCreateOpen(false)}
        onSaved={async () => {
          setActionMessage("Lançamento criado com sucesso.");
          await fetchTransactions();
        }}
      />

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

export function TransactionsDashboard() {
  return (
    <SettingsToastProvider>
      <TransactionsDashboardContent />
    </SettingsToastProvider>
  );
}
