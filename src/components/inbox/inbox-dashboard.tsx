"use client";

import type { FinanceCatalog, InboxItem, InboxListResponse } from "@/types/inbox";
import { INBOX_STATUS_TABS, type InboxStatusFilter } from "@/types/inbox.constants";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmTransactionDrawer } from "./confirm-transaction-drawer";
import { InboxItemList } from "./inbox-item-list";
import { InboxMetricsCards } from "./inbox-metrics-cards";
import { QuickIngest } from "./quick-ingest";
import { cn } from "@/lib/utils/cn";
import { Loader2, Upload } from "lucide-react";
import { FinancialFileImportModal } from "./financial-file-import-modal";
import { SettingsToastProvider, useSettingsToast } from "@/components/settings/settings-toast";
import { InboxBulkReviewModal } from "./inbox-bulk-review-modal";

function InboxDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useSettingsToast();
  const activeStatus = (searchParams.get("status") as InboxStatusFilter | null) ?? "ALL";

  const [allItems, setAllItems] = useState<InboxItem[]>([]);
  const [catalog, setCatalog] = useState<FinanceCatalog>({
    accounts: [],
    categories: [],
    paymentMethods: [],
    cards: [],
  });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchInbox = useCallback(async () => {
    const response = await fetch("/api/inbox?limit=100", { credentials: "include" });

    if (response.status === 401) {
      setAuthError(true);
      return;
    }

    if (!response.ok) {
      throw new Error("Falha ao carregar a Caixa Financeira");
    }

    const data = (await response.json()) as InboxListResponse;
    setAllItems(data.items);
    setAuthError(false);
  }, []);

  const fetchCatalog = useCallback(async () => {
    const response = await fetch("/api/finance/catalog", { credentials: "include" });
    if (response.ok) {
      const data = (await response.json()) as FinanceCatalog;
      setCatalog(data);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchInbox(), fetchCatalog()])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fetchInbox, fetchCatalog]);

  useEffect(() => {
    const hasActiveProcessing = allItems.some(
      (item) => item.status === "PENDING" || item.status === "PROCESSING",
    );

    if (!hasActiveProcessing) {
      return;
    }

    const interval = setInterval(() => {
      fetchInbox().catch(console.error);
    }, 3000);

    return () => clearInterval(interval);
  }, [allItems, fetchInbox]);

  const filteredItems = useMemo(() => {
    if (activeStatus === "ALL") {
      return allItems;
    }

    return allItems.filter((item) => item.status === activeStatus);
  }, [allItems, activeStatus]);

  function handleTabChange(status: InboxStatusFilter) {
    const params = new URLSearchParams(searchParams.toString());

    if (status === "ALL") {
      params.delete("status");
    } else {
      params.set("status", status);
    }

    const query = params.toString();
    router.push(query ? `/dashboard/inbox?${query}` : "/dashboard/inbox");
  }

  function handleReview(item: InboxItem) {
    setSelectedItem(item);
    setDrawerOpen(true);
  }

  function handleConfirmed(itemId: string) {
    setAllItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, status: "SAVED" } : item,
      ),
    );
  }

  const reviewableItems = useMemo(
    () => filteredItems.filter((item) => item.status === "NEEDS_CONFIRMATION"),
    [filteredItems],
  );

  const pageAllSelected =
    reviewableItems.length > 0 && reviewableItems.every((item) => selectedIds.has(item.id));

  function toggleSelectAllReviewable() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (pageAllSelected) {
        reviewableItems.forEach((item) => next.delete(item.id));
      } else {
        reviewableItems.forEach((item) => next.add(item.id));
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-amber-900">Autenticação necessária</h2>
        <p className="mt-2 text-sm text-amber-800">
          Faça login com <code className="rounded bg-amber-100 px-1">dev@logos.local</code> para
          acessar a Caixa Financeira.
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Caixa Financeira</h1>
          <p className="mt-1 text-sm text-slate-500">
            Visão cognitiva do Logos — IA, regras automáticas e confirmações pendentes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Upload className="h-4 w-4" />
          Importar Extrato / Fatura
        </button>
      </header>

      <InboxMetricsCards items={allItems} />

      <QuickIngest
        onSubmitted={() => {
          fetchInbox().catch(console.error);
        }}
      />

      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {INBOX_STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleTabChange(tab.value)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              activeStatus === tab.value
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleSelectAllReviewable}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {pageAllSelected ? "Desmarcar revisão" : "Selecionar revisão"}
        </button>
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          disabled={selectedIds.size === 0}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Revisão em massa ({selectedIds.size})
        </button>
      </div>

      <InboxItemList items={filteredItems} onReview={handleReview} />

      <ConfirmTransactionDrawer
        item={selectedItem}
        catalog={catalog}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onConfirmed={handleConfirmed}
      />

      <FinancialFileImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImportSuccess={(result) => {
          pushToast(
            "success",
            `Arquivo importado. ${result.imported} lançamentos enviados para revisão.`,
          );
          fetchInbox().catch(console.error);
        }}
      />

      <InboxBulkReviewModal
        open={bulkOpen}
        selectedIds={[...selectedIds]}
        catalog={catalog}
        onClose={() => setBulkOpen(false)}
        onSaved={(result) => {
          pushToast(
            "success",
            `Revisão em massa concluída: ${result.updated} atualizados, ${result.skipped} ignorados, ${result.failed} falhas.`,
          );
          setSelectedIds(new Set());
          fetchInbox().catch(console.error);
        }}
      />
    </div>
  );
}

export function InboxDashboard() {
  return (
    <SettingsToastProvider>
      <InboxDashboardContent />
    </SettingsToastProvider>
  );
}
