"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, ArrowDownLeft, TrendingUp, DollarSign, Calendar } from "lucide-react";
import type { CashflowPeriodData } from "@/modules/transactions/services/get-cashflow-analytics";

interface CashflowAnalyticsViewProps {
  data: CashflowPeriodData[];
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function CashflowAnalyticsView({ data }: CashflowAnalyticsViewProps) {
  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let netBalance = 0;

    for (const period of data) {
      totalIncome += period.income;
      totalExpense += period.expense;
    }
    netBalance = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      netBalance,
      lastCumulative: data[data.length - 1]?.cumulative ?? 0,
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-350 bg-neutral-50/50 p-8 text-center dark:border-neutral-800 dark:bg-neutral-900/20">
        <DollarSign className="h-10 w-10 text-neutral-400" />
        <h3 className="mt-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Nenhum dado de fluxo de caixa encontrado
        </h3>
        <p className="mt-2 text-sm text-neutral-500 max-w-sm">
          Comece a cadastrar transações com categorias de receita ou despesa para visualizar suas análises e DRE.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 ease-out">
      {/* Header */}
      <header className="space-y-1">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Fluxo de Caixa Realizado (DRE)
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Análise histórica consolidada por competência (mês/ano) dividida entre entradas e saídas.
        </p>
      </header>

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Total de Entradas</span>
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">{formatBRL(summary.totalIncome)}</p>
        </article>

        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Total de Saídas</span>
            <ArrowDownLeft className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">{formatBRL(summary.totalExpense)}</p>
        </article>

        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Resultado Líquido</span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <p className={`mt-2 text-2xl font-bold ${summary.netBalance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {formatBRL(summary.netBalance)}
          </p>
        </article>

        <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Saldo Acumulado</span>
            <DollarSign className="h-4 w-4 text-neutral-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">{formatBRL(summary.lastCumulative)}</p>
        </article>
      </section>

      {/* Charts section */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:col-span-7">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
            Evolução Mensal do Saldo Acumulado
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-neutral-900" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  tickFormatter={(v: number) =>
                    new Intl.NumberFormat("pt-BR", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(v)
                  }
                />
                <Tooltip formatter={(value) => formatBRL(Number(value))} />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#4f46e5"
                  fill="url(#cashflowGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:col-span-5">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
            Fluxo Operacional Líquido por Período
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-neutral-900" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  tickFormatter={(v: number) =>
                    new Intl.NumberFormat("pt-BR", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(v)
                  }
                />
                <Tooltip formatter={(value) => formatBRL(Number(value))} />
                <Bar
                  dataKey="net"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* DRE Table */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
          <Calendar className="h-4 w-4" />
          Demonstração do Resultado de Exercício (DRE Mensal)
        </h3>
        <div className="mt-4 overflow-auto rounded-lg border border-neutral-100 dark:border-neutral-900">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3 text-right">Entradas (+)</th>
                <th className="px-4 py-3 text-right">Saídas (-)</th>
                <th className="px-4 py-3 text-right">Resultado Operacional</th>
                <th className="px-4 py-3 text-right">Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-900">
              {data.map((period) => (
                <tr key={period.period} className="hover:bg-slate-50/50 dark:hover:bg-neutral-900/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{period.period}</td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600">{formatBRL(period.income)}</td>
                  <td className="px-4 py-3 text-right font-medium text-rose-600">{formatBRL(period.expense)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${period.net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {formatBRL(period.net)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">{formatBRL(period.cumulative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
