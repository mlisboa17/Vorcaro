"use client";

import Link from "next/link";
import { CalendarClock, Loader2, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DASHBOARD_RECURRING_ROUTE } from "@/lib/navigation/dashboard-nav";
import {
  COMMITMENT_ORIGIN_LABELS,
  COMMITMENT_STATUS_LABELS,
  type CommitmentOrigin,
  type CommitmentStatus,
  type CommitmentType,
  type MonthlyCommitmentsSummaryDto,
} from "@/types/commitments";
import { SettingsToastProvider, useSettingsToast } from "@/components/settings/settings-toast";
import { cn } from "@/lib/utils/cn";

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string): string {
  return new Date(`${value}T12:00:00.000Z`).toLocaleDateString("pt-BR");
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function CommitmentsDashboardInner() {
  const { pushToast } = useSettingsToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MonthlyCommitmentsSummaryDto | null>(null);
  const [month, setMonth] = useState(currentMonth());
  const [originFilter, setOriginFilter] = useState<CommitmentOrigin | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<CommitmentStatus | "ALL">("ALL");
  const [tipoFilter, setTipoFilter] = useState<CommitmentType | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/commitments/monthly?month=${month}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Falha ao carregar compromissos.");
      const payload = (await response.json()) as MonthlyCommitmentsSummaryDto;
      setData(payload);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao carregar.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [month, pushToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    return data.items.filter((item) => {
      if (originFilter !== "ALL" && item.origem !== originFilter) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (tipoFilter !== "ALL" && item.tipo !== tipoFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!item.descricao.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, originFilter, statusFilter, tipoFilter, search]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <CalendarClock className="h-6 w-6 text-emerald-600" />
            Compromissos Recorrentes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Visão mensal consolidada de saídas comprometidas, entradas previstas e vencimentos.
          </p>
        </div>
        <Link
          href={DASHBOARD_RECURRING_ROUTE}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-emerald-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
        >
          <RefreshCw className="h-4 w-4" />
          Gerenciar recorrências
        </Link>
      </header>

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Saídas comprometidas", value: formatBRL(data.totalOutflows), tone: "text-rose-700" },
              { label: "Entradas previstas", value: formatBRL(data.totalInflows), tone: "text-emerald-700" },
              {
                label: "Saldo líquido previsto",
                value: formatBRL(data.totalInflows - data.totalOutflows),
                tone: data.totalInflows >= data.totalOutflows ? "text-emerald-700" : "text-rose-700",
              },
              { label: "Vencidos", value: String(data.overdueCount), tone: "text-amber-700" },
              { label: "Próximos 7 dias", value: String(data.next7DaysCount), tone: "text-slate-900" },
            ].map((card) => (
              <article
                key={card.label}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className={cn("mt-1 text-xl font-bold", card.tone)}>{card.value}</p>
              </article>
            ))}
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-500">Mês</span>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-500">Origem</span>
                <select
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value as CommitmentOrigin | "ALL")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="ALL">Todas</option>
                  {Object.entries(COMMITMENT_ORIGIN_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-500">Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as CommitmentStatus | "ALL")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="ALL">Todos</option>
                  {Object.entries(COMMITMENT_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-500">Tipo</span>
                <select
                  value={tipoFilter}
                  onChange={(e) => setTipoFilter(e.target.value as CommitmentType | "ALL")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="ALL">Todos</option>
                  <option value="OUTFLOW">Saída</option>
                  <option value="INFLOW">Entrada</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-500">Busca</span>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Descrição..."
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
                  />
                </div>
              </label>
            </div>
          </section>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Conta / Cartão</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Nenhum compromisso encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(item.dataPrevista)}</td>
                      <td className="px-4 py-3">{item.descricao}</td>
                      <td className="px-4 py-3">{COMMITMENT_ORIGIN_LABELS[item.origem]}</td>
                      <td
                        className={cn(
                          "px-4 py-3 font-medium",
                          item.tipo === "INFLOW" ? "text-emerald-700" : "text-slate-900",
                        )}
                      >
                        {formatBRL(item.valor)}
                      </td>
                      <td className="px-4 py-3">{COMMITMENT_STATUS_LABELS[item.status]}</td>
                      <td className="px-4 py-3 text-slate-600">{item.categoria ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{item.cartao ?? item.conta ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-sm text-rose-600">Não foi possível carregar os compromissos.</p>
      )}
    </div>
  );
}

export function CommitmentsDashboard() {
  return (
    <SettingsToastProvider>
      <CommitmentsDashboardInner />
    </SettingsToastProvider>
  );
}

export default CommitmentsDashboard;
