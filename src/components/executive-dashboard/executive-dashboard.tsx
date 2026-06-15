"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Inbox,
  CalendarClock,
  Landmark,
  Handshake,
  PiggyBank,
  FileUp,
  Loader2,
  ArrowRight,
} from "lucide-react";
import type { CashFlowProjectionDTO } from "@/types/cashflow";
import type { ExecutiveDashboardDTO } from "@/types/executive-dashboard";
import { SettingsToastProvider, useSettingsToast } from "@/components/settings/settings-toast";

function formatBRL(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
}

function ExecutiveDashboardInner() {
  const { pushToast } = useSettingsToast();
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [data, setData] = useState<ExecutiveDashboardDTO | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const executiveRes = await fetch("/api/executive-dashboard", { credentials: "include" });

      if (executiveRes.status === 401) {
        setAuthError(true);
        return;
      }

      if (!executiveRes.ok) {
        throw new Error("Falha ao carregar o dashboard executivo.");
      }

      const executivePayload = (await executiveRes.json()) as ExecutiveDashboardDTO;
      setData(executivePayload);
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
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Visão Geral</h1>
        <p className="mt-1 text-sm text-slate-500">
          Acesso rápido aos principais módulos do Logos Financeiro.
        </p>
      </header>

      {loading && !data ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Caixa Financeiro */}
          <Link
            href="/dashboard/inbox"
            className="group block rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors group-hover:text-sky-700">
                Caixa Financeiro
              </span>
              <Inbox className="h-5 w-5 text-slate-400 transition-colors group-hover:text-sky-500" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {data ? formatBRL(data.cash.saldoAtual) : "—"}
              </span>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Saldo em conta</span>
                <span className="flex items-center gap-0.5 font-semibold text-sky-600">
                  Ver caixa <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </Link>

          {/* Card 2: Fluxo de Caixa */}
          <Link
            href="/dashboard/cashflow"
            className="group block rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors group-hover:text-sky-700">
                Fluxo de Caixa
              </span>
              <CalendarClock className="h-5 w-5 text-slate-400 transition-colors group-hover:text-sky-500" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {data ? formatBRL(data.cash.saldoProjetado30Dias) : "—"}
              </span>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Projeção 30d</span>
                <span className="flex items-center gap-0.5 font-semibold text-sky-600">
                  Ver fluxo <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </Link>

          {/* Card 3: Patrimônio */}
          <Link
            href="/dashboard/patrimony"
            className="group block rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors group-hover:text-sky-700">
                Patrimônio
              </span>
              <Landmark className="h-5 w-5 text-slate-400 transition-colors group-hover:text-sky-500" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {data ? formatBRL(data.patrimony.patrimonioLiquido) : "—"}
              </span>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Ativos Líquidos</span>
                <span className="flex items-center gap-0.5 font-semibold text-sky-600">
                  Ver patrimônio <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </Link>

          {/* Card 4: Consórcios */}
          <Link
            href="/dashboard/consorcios"
            className="group block rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors group-hover:text-sky-700">
                Consórcios
              </span>
              <Handshake className="h-5 w-5 text-slate-400 transition-colors group-hover:text-sky-500" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {data ? formatBRL(data.consortium.creditoTotalConsorcio) : "—"}
              </span>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Limite Consolidado</span>
                <span className="flex items-center gap-0.5 font-semibold text-sky-600">
                  Ver consórcios <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </Link>

          {/* Card 5: Orçamentos */}
          <Link
            href="/dashboard/settings?tab=orcamentos"
            className="group block rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors group-hover:text-sky-700">
                Orçamentos
              </span>
              <PiggyBank className="h-5 w-5 text-slate-400 transition-colors group-hover:text-sky-500" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {data ? formatBRL(data.budget.totalPlanejado) : "—"}
              </span>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Total Planejado</span>
                <span className="flex items-center gap-0.5 font-semibold text-sky-600">
                  Ver orçamentos <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </Link>

          {/* Card 6: Importar Extrato/Fatura */}
          <Link
            href="/dashboard/statements"
            className="group block rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors group-hover:text-sky-700">
                Importar Extrato/Fatura
              </span>
              <FileUp className="h-5 w-5 text-slate-400 transition-colors group-hover:text-sky-500" />
            </div>
            <div className="mt-4">
              <span className="text-lg font-bold tracking-tight text-slate-700 block min-h-[2rem]">
                Conciliação Inteligente
              </span>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Central de arquivos</span>
                <span className="flex items-center gap-0.5 font-semibold text-sky-600">
                  Importar agora <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </Link>
        </div>
      )}
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
