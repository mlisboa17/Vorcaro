"use client";

import type {
  ConfigCartao,
  ConfigConta,
  ConfigCategoria,
  ConfigFormaPagamento,
} from "@/types/instruments-config";
import { isSettingsTab, SETTINGS_TABS, type SettingsTab } from "@/types/settings-config";
import { AccountsSettingsPanel } from "./panels/accounts-settings-panel";
import { CardsSettingsPanel } from "./panels/cards-settings-panel";
import { CategoriesSettingsPanel } from "./panels/categories-settings-panel";
import { PaymentMethodsSettingsPanel } from "./panels/payment-methods-settings-panel";
import { SettingsComingSoon } from "./settings-shared";
import { SettingsToastProvider } from "./settings-toast";
import { RecurringDashboard } from "@/components/recurring/recurring-dashboard";
import { buildListUrl, fetchInstrumentList } from "@/lib/instruments/instrument-api";
import { cn } from "@/lib/utils/cn";
import {
  Building2,
  CreditCard,
  Coins,
  Landmark,
  Loader2,
  PiggyBank,
  RefreshCw,
  Scale,
  Tag,
  TrendingDown,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const TAB_ICONS = {
  categorias: Tag,
  contas: Landmark,
  cartoes: CreditCard,
  formas: Coins,
  recorrentes: RefreshCw,
  orcamentos: PiggyBank,
  ativos: Building2,
  passivos: TrendingDown,
} as const;

interface SettingsData {
  contas: ConfigConta[];
  cartoes: ConfigCartao[];
  categorias: ConfigCategoria[];
  formasPagamento: ConfigFormaPagamento[];
}

export function SettingsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: SettingsTab = isSettingsTab(tabParam) ? tabParam : "categorias";

  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [authError, setAuthError] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [contas, cartoes, categorias, formasPagamento] = await Promise.all([
        fetchInstrumentList<ConfigConta>(buildListUrl("/api/config/contas", showInactive)),
        fetchInstrumentList<ConfigCartao>(buildListUrl("/api/config/cartoes", showInactive)),
        fetchInstrumentList<ConfigCategoria>(buildListUrl("/api/config/categorias", showInactive)),
        fetchInstrumentList<ConfigFormaPagamento>(
          buildListUrl("/api/config/formas-pagamento", showInactive),
        ),
      ]);

      setData({ contas, cartoes, categorias, formasPagamento });
      setAuthError(false);
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        setAuthError(true);
        return;
      }

      throw error;
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

    useEffect(() => {
    if (
      activeTab === "recorrentes" ||
      activeTab === "orcamentos" ||
      activeTab === "ativos" ||
      activeTab === "passivos"
    ) {
      setLoading(false);
      return;
    }

    void fetchAll().catch(console.error);
  }, [activeTab, fetchAll]);

  function handleTabChange(tab: SettingsTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/dashboard/settings?${params.toString()}`);
  }

  if (authError) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-amber-900">Autenticação necessária</h2>
        <p className="mt-2 text-sm text-amber-800">Faça login para gerenciar os cadastros financeiros.</p>
        <a
          href="/api/auth/signin?callbackUrl=/dashboard/settings"
          className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Entrar
        </a>
      </div>
    );
  }

  return (
    <SettingsToastProvider>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cadastros</h1>
            <p className="mt-1 text-sm text-slate-500">
              Central de configurações financeiras — categorias, contas, cartões e demais cadastros.
            </p>
          </div>
          <a
            href="/dashboard/settings/integrations"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Integrações →
          </a>
        </header>

        <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-1">
          {SETTINGS_TABS.map((tab) => {
            const Icon = TAB_ICONS[tab.value];
            const isActive = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleTabChange(tab.value)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "border-b-2 border-emerald-600 bg-white text-slate-900"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                  !tab.enabled && !isActive && "opacity-70",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {activeTab === "categorias" ? (
          <CategoriesSettingsPanel
            items={data?.categorias ?? []}
            loading={loading}
            showInactive={showInactive}
            onShowInactiveChange={setShowInactive}
            onRefresh={fetchAll}
          />
        ) : null}

        {activeTab === "contas" ? (
          <AccountsSettingsPanel
            items={data?.contas ?? []}
            loading={loading}
            showInactive={showInactive}
            onShowInactiveChange={setShowInactive}
            onRefresh={fetchAll}
          />
        ) : null}

        {activeTab === "cartoes" ? (
          <CardsSettingsPanel
            items={data?.cartoes ?? []}
            contas={data?.contas ?? []}
            loading={loading}
            showInactive={showInactive}
            onShowInactiveChange={setShowInactive}
            onRefresh={fetchAll}
          />
        ) : null}

        {activeTab === "formas" ? (
          <PaymentMethodsSettingsPanel
            items={data?.formasPagamento ?? []}
            loading={loading}
            showInactive={showInactive}
            onShowInactiveChange={setShowInactive}
            onRefresh={fetchAll}
          />
        ) : null}

        {activeTab === "recorrentes" ? <RecurringDashboard embedded /> : null}

        {activeTab === "orcamentos" ? <SettingsComingSoon title="Orçamentos" /> : null}
        {activeTab === "ativos" ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-sm text-slate-600">
              A gestão de ativos e patrimônio está na área dedicada.
            </p>
            <a
              href="/dashboard/patrimony?tab=ativos"
              className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Abrir Patrimônio → Ativos
            </a>
          </div>
        ) : null}
        {activeTab === "passivos" ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-sm text-slate-600">
              A gestão de passivos e dívidas está na área dedicada.
            </p>
            <a
              href="/dashboard/patrimony?tab=passivos"
              className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Abrir Patrimônio → Passivos
            </a>
          </div>
        ) : null}
      </div>
    </SettingsToastProvider>
  );
}
