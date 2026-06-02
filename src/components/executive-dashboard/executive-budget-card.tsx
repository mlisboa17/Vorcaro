"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExecutiveDashboardDTO } from "@/types/executive-dashboard";
import { ExecutiveSkeleton, formatBRL } from "./executive-shared";

interface ExecutiveBudgetCardProps {
  data: ExecutiveDashboardDTO | null;
  loading?: boolean;
}

export function ExecutiveBudgetCard({ data, loading }: ExecutiveBudgetCardProps) {
  const chartData =
    data == null
      ? []
      : [
          {
            nome: "Mês atual",
            planejado: data.budget.totalPlanejado,
            realizado: data.budget.totalRealizadoDre,
          },
        ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header>
        <h2 className="text-sm font-semibold text-slate-900">Orçamento — planejado vs realizado</h2>
        <p className="mt-1 text-xs text-slate-500">
          Planejado com base em recorrências de despesa; realizado na visão DRE do mês.
        </p>
      </header>

      {data && !loading ? (
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
          <span>
            Estouradas: <strong className="text-red-700">{data.budget.categoriasEstouradas}</strong>
          </span>
          <span>
            Em atenção:{" "}
            <strong className="text-amber-700">{data.budget.categoriasAtencao}</strong>
          </span>
        </div>
      ) : null}

      <div className="mt-4 h-64">
        {loading || !data ? (
          <ExecutiveSkeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#64748b"
                tickFormatter={(v: number) =>
                  new Intl.NumberFormat("pt-BR", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(v)
                }
              />
              <Tooltip formatter={(value) => formatBRL(Number(value))} />
              <Legend />
              <Bar dataKey="planejado" name="Planejado" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="realizado" name="Realizado DRE" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
