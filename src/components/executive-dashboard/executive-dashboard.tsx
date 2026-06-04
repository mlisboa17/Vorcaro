"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  Handshake,
  Inbox,
  Landmark,
  Loader2,
  PiggyBank,
  Upload,
  Wallet,
} from "lucide-react";
import type { CashFlowProjectionDTO } from "@/types/cashflow";
import type { ExecutiveDashboardDTO } from "@/types/executive-dashboard";
import { FinancialFileImportModal } from "@/components/inbox/financial-file-import-modal";
import { SettingsToastProvider, useSettingsToast } from "@/components/settings/settings-toast";
import { ExecutiveAlertsPanel } from "./executive-alerts-panel";
import { ExecutiveBudgetCard } from "./executive-budget-card";
import { ExecutiveCashflowCard } from "./executive-cashflow-card";
import { ExecutivePatrimonyCard } from "./executive-patrimony-card";
import { ExecutiveConsortiumSummary } from "./executive-consortium-summary";
import { ExecutiveInstallmentsCard } from "./executive-installments-card";
import { ExecutivePlanningCard } from "./executive-planning-card";
import { ExecutiveSummaryCards } from "./executive-summary-cards";
import { ExecutiveCommitmentsCard } from "./commitments-card";
import { ExecutiveAlertsCard } from "./alerts-card";
import { ExecutiveRecommendedActionsCard } from "./recommended-actions-card";

const QUICK_ACTIONS = [
  { href: "/dashboard/inbox", label: "Ver Caixa Financeira", icon: Inbox },
  { href: "/dashboard/cashflow", label: "Ver Fluxo de Caixa", icon: CalendarClock },
  { href: "/dashboard/patrimony", label: "Ver Patrimônio", icon: Landmark },
  { href: "/dashboard/consorcios", label: "Ver Consórcios", icon: Handshake },
  { href: "/dashboard/settings?tab=orcamentos", label: "Ver Orçamentos", icon: PiggyBank },
] as const;

function ExecutiveDashboardInner() {
  const { pushToast } = useSettingsToast();
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [data, setData] = useState<ExecutiveDashboardDTO | null>(null);
  const [projection, setProjection] = useState<CashFlowProjectionDTO | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [executiveRes, projectionRes] = await Promise.all([
        fetch("/api/executive-dashboard", { credentials: "include" }),
        fetch("/api/cashflow/projection", { credentials: "include" }),
      ]);

      if (executiveRes.status === 401 || projectionRes.status === 401) {
        setAuthError(true);
        return;
      }

      if (!executiveRes.ok || !projectionRes.ok) {
        throw new Error("Falha ao carregar o dashboard executivo.");
      }

      const [executivePayload, projectionPayload] = await Promise.all([
        executiveRes.json() as Promise<ExecutiveDashboardDTO>,
        projectionRes.json() as Promise<CashFlowProjectionDTO>,
      ]);

      setData(executivePayload);
      setProjection(projectionPayload);
      setAuthError(false);
    } catch (error) {
      pushToast(
        "error",
        error instanceof Error ? error.message : "Erro ao carregar dashboard executivo.",
      );
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (authError) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-amber-900">Autenticação necessária</h2>
        <p className="mt-2 text-sm text-amber-800">Faça login para acessar o dashboard executivo.</p>
        <a
          href="/api/auth/signin?callbackUrl=/dashboard"
          className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Entrar
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Executivo</h1>
          <p className="mt-1 text-sm text-slate-500">
            Visão consolidada de caixa, mês corrente, orçamento e patrimônio.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800"
              >
                <Icon className="h-3.5 w-3.5" />
                {action.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            <Upload className="h-3.5 w-3.5" />
            Importar Extrato/Fatura
          </button>
        </div>
      </header>

      {loading && !data ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
        </div>
      ) : null}

      <ExecutiveSummaryCards data={data} loading={loading} />

      <ExecutiveConsortiumSummary consortium={data?.consortium} loading={loading} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ExecutiveCashflowCard projection={projection} loading={loading} />
        </div>
        <ExecutiveAlertsPanel alerts={data?.alerts ?? []} loading={loading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-5">
        <ExecutiveBudgetCard data={data} loading={loading} />
        <ExecutivePatrimonyCard data={data} loading={loading} />
        <ExecutivePlanningCard planning={data?.planning} />
        <ExecutiveInstallmentsCard installments={data?.installments} />
        <ExecutiveCommitmentsCard />
        <ExecutiveAlertsCard />
      </div>

      <ExecutiveRecommendedActionsCard />

      {data ? (
        <section className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <article>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Receitas do mês
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-700">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                data.month.receitas,
              )}
            </p>
          </article>
          <article>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Despesas DRE
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                data.month.despesasDre,
              )}
            </p>
          </article>
          <article>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Saldo do mês (caixa)
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                data.month.saldoMes,
              )}
            </p>
          </article>
          <article className="flex items-center gap-2 text-sm text-slate-600">
            <Wallet className="h-4 w-4 text-slate-400" />
            Projeção 90d:{" "}
            <strong>
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                data.cash.saldoProjetado90Dias,
              )}
            </strong>
          </article>
        </section>
      ) : null}

      <FinancialFileImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImportSuccess={() => {
          setImportOpen(false);
          void load();
        }}
      />
    </div>
  );
}

export function ExecutiveDashboard() {
  return (
    <SettingsToastProvider>
      <ExecutiveDashboardInner />
    </SettingsToastProvider>
  );
}
