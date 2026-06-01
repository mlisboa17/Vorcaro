"use client";

import type {
  ConfigCartao,
  ConfigConta,
  ConfigCategoria,
  ConfigFormaPagamento,
  InstrumentsData,
  InstrumentsTab,
} from "@/types/instruments-config";
import { INSTRUMENTS_TABS } from "@/types/instruments-config";
import { AccountsPanel } from "./accounts-panel";
import { CardsPanel } from "./cards-panel";
import { CategoriesPanel } from "./categories-panel";
import { PaymentMethodsPanel } from "./payment-methods-panel";
import { cn } from "@/lib/utils/cn";
import { fetchInstrumentList } from "@/lib/instruments/instrument-api";
import { countCategoryTreeNodes } from "@/lib/categories/category-utils";
import { Coins, CreditCard, Loader2, Tag, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const TAB_ICONS = {
  categorias: Tag,
  contas: Wallet,
  cartoes: CreditCard,
  formas: Coins,
} as const;

export function InstrumentsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as InstrumentsTab | null) ?? "categorias";

  const [data, setData] = useState<InstrumentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const fetchAll = useCallback(async () => {
    try {
      const [contas, cartoes, categorias, formasPagamento] = await Promise.all([
        fetchInstrumentList<ConfigConta>("/api/config/contas"),
        fetchInstrumentList<ConfigCartao>("/api/config/cartoes"),
        fetchInstrumentList<ConfigCategoria>("/api/config/categorias"),
        fetchInstrumentList<ConfigFormaPagamento>("/api/config/formas-pagamento"),
      ]);

      setData({ contas, cartoes, categorias, formasPagamento });
      setAuthError(false);
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        setAuthError(true);
        return;
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchAll()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fetchAll]);

  function handleTabChange(tab: InstrumentsTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/dashboard/instruments?${params.toString()}`);
  }

  function handleNotify(message: { type: "success" | "error"; text: string }) {
    setActionMessage(message);
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
          gerenciar os instrumentos financeiros.
        </p>
        <a
          href="/api/auth/signin?callbackUrl=/dashboard/instruments"
          className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Entrar
        </a>
      </div>
    );
  }

  const tabCounts: Record<InstrumentsTab, number> = {
    categorias: countCategoryTreeNodes(data?.categorias ?? []),
    contas: data?.contas.length ?? 0,
    cartoes: data?.cartoes.length ?? 0,
    formas: data?.formasPagamento.length ?? 0,
  };

  const panelProps = {
    onCreated: fetchAll,
    onNotify: handleNotify,
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Instrumentos Financeiros
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie categorias, contas, cartões e formas de pagamento antes de importar extratos.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {INSTRUMENTS_TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.value];
          const isActive = activeTab === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTabChange(tab.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition",
                isActive
                  ? "border-b-2 border-slate-900 bg-white text-slate-900"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  isActive ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600",
                )}
              >
                {tabCounts[tab.value]}
              </span>
            </button>
          );
        })}
      </nav>

      {actionMessage ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            actionMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800",
          )}
        >
          {actionMessage.text}
        </div>
      ) : null}

      {activeTab === "categorias" ? (
        <CategoriesPanel items={data?.categorias ?? []} {...panelProps} />
      ) : null}

      {activeTab === "contas" ? (
        <AccountsPanel items={data?.contas ?? []} {...panelProps} />
      ) : null}

      {activeTab === "cartoes" ? (
        <CardsPanel
          items={data?.cartoes ?? []}
          contas={data?.contas ?? []}
          {...panelProps}
        />
      ) : null}

      {activeTab === "formas" ? (
        <PaymentMethodsPanel items={data?.formasPagamento ?? []} {...panelProps} />
      ) : null}
    </div>
  );
}
