"use client";

import type { FinanceCatalog, InboxItem, InboxListResponse, InboxStatusFilter } from "@/types/inbox";
import { INBOX_STATUS_TABS } from "@/types/inbox";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmTransactionDrawer } from "./confirm-transaction-drawer";
import { InboxItemList } from "./inbox-item-list";
import { InboxMetricsCards } from "./inbox-metrics-cards";
import { QuickIngest } from "./quick-ingest";
import { cn } from "@/lib/utils/cn";
import { Loader2 } from "lucide-react";

export function InboxDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Caixa Financeira</h1>
        <p className="mt-1 text-sm text-slate-500">
          Visão cognitiva do Logos — IA, regras automáticas e confirmações pendentes.
        </p>
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

      <InboxItemList items={filteredItems} onReview={handleReview} />

      <ConfirmTransactionDrawer
        item={selectedItem}
        catalog={catalog}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onConfirmed={handleConfirmed}
      />
    </div>
  );
}
