"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarRange, Loader2, Wallet } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CashFlowProjectionDTO } from "@/types/cashflow";
import { SettingsToastProvider, useSettingsToast } from "@/components/settings/settings-toast";

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function CashflowDashboardInner() {
  const { pushToast } = useSettingsToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CashFlowProjectionDTO | null>(null);

  useEffect(() => {
    async function loadProjection() {
      setLoading(true);
      try {
        const response = await fetch("/api/cashflow/projection", { credentials: "include" });
        if (!response.ok) {
          throw new Error("Falha ao carregar projeção de fluxo de caixa.");
        }
        const payload = (await response.json()) as CashFlowProjectionDTO;
        setData(payload);
      } catch (error) {
        pushToast(
          "error",
          error instanceof Error ? error.message : "Erro ao carregar fluxo de caixa futuro.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadProjection();
  }, [pushToast]);

  const timelinePoints = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Hoje", saldo: data.saldoAtual },
      { label: "+7d", saldo: data.previsao7Dias },
      { label: "+30d", saldo: data.previsao30Dias },
      { label: "+60d", saldo: data.previsao60Dias },
      { label: "+90d", saldo: data.previsao90Dias },
      { label: "+180d", saldo: data.previsao180Dias },
      { label: "+365d", saldo: data.previsao365Dias },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900">
        Não foi possível carregar a projeção de fluxo de caixa.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fluxo de Caixa Futuro</h1>
        <p className="mt-1 text-sm text-slate-500">
          Projeção financeira para 7, 30, 60, 90, 180 e 365 dias, com alertas preventivos.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo Atual</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatBRL(data.saldoAtual)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Saldo Projetado 30 dias
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatBRL(data.previsao30Dias)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Saldo Projetado 90 dias
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatBRL(data.previsao90Dias)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data Crítica</p>
          <p
            className={`mt-2 text-2xl font-bold ${
              data.primeiraDataNegativa ? "text-red-700" : "text-emerald-700"
            }`}
          >
            {data.primeiraDataNegativa ?? "Estável"}
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Linha do tempo de saldo projetado</h2>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelinePoints}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" stroke="#64748b" />
              <YAxis stroke="#64748b" tickFormatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`} />
              <Tooltip formatter={(value) => formatBRL(Number(value))} />
              <Area type="monotone" dataKey="saldo" stroke="#0f172a" fill="#cbd5e1" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <CalendarRange className="h-4 w-4" />
            Próximos compromissos
          </h3>
          <div className="mt-4 max-h-96 overflow-auto rounded-lg border border-slate-100">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2">Origem</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.eventos.slice(0, 50).map((event) => (
                  <tr key={event.id}>
                    <td className="px-3 py-2">{event.data}</td>
                    <td className="px-3 py-2">{event.descricao}</td>
                    <td className="px-3 py-2">
                      {event.origem === "RECEIVABLE" ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          Receita prevista
                        </span>
                      ) : (
                        event.origem
                      )}
                    </td>
                    <td className={`px-3 py-2 text-right font-medium ${event.valor < 0 ? "text-red-700" : "text-emerald-700"}`}>
                      {formatBRL(event.valor)}
                    </td>
                  </tr>
                ))}
                {data.eventos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                      Nenhum compromisso previsto.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <AlertTriangle className="h-4 w-4" />
            Alertas automáticos
          </h3>
          <div className="mt-4 space-y-3">
            {data.alertas.length === 0 ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Nenhum alerta crítico no horizonte atual.
              </div>
            ) : (
              data.alertas.map((alerta, index) => (
                <div
                  key={`${alerta.tipo}-${index}`}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    alerta.gravidade === "CRITICAL"
                      ? "border border-red-200 bg-red-50 text-red-800"
                      : alerta.gravidade === "WARNING"
                        ? "border border-amber-200 bg-amber-50 text-amber-800"
                        : "border border-sky-200 bg-sky-50 text-sky-800"
                  }`}
                >
                  <p className="font-semibold">{alerta.tipo}</p>
                  <p>{alerta.mensagem}</p>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <p className="inline-flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5" />
              Projeção baseada em eventos financeiros futuros e recorrências ativas.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}

export function CashflowDashboard() {
  return (
    <SettingsToastProvider>
      <CashflowDashboardInner />
    </SettingsToastProvider>
  );
}

