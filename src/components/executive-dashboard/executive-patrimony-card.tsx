"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ExecutiveDashboardDTO } from "@/types/executive-dashboard";
import { ExecutiveSkeleton, formatBRL } from "./executive-shared";

interface ExecutivePatrimonyCardProps {
  data: ExecutiveDashboardDTO | null;
  loading?: boolean;
}

const COLORS = ["#0f766e", "#dc2626"];

export function ExecutivePatrimonyCard({ data, loading }: ExecutivePatrimonyCardProps) {
  const chartData =
    data == null
      ? []
      : [
          { name: "Ativos", value: data.patrimony.totalAtivos },
          { name: "Passivos", value: data.patrimony.totalPassivos },
        ].filter((row) => row.value > 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header>
        <h2 className="text-sm font-semibold text-slate-900">Patrimônio — ativos vs passivos</h2>
        <p className="mt-1 text-xs text-slate-500">
          Patrimônio líquido:{" "}
          {data ? (
            <strong className="text-slate-800">{formatBRL(data.patrimony.patrimonioLiquido)}</strong>
          ) : (
            "—"
          )}
        </p>
      </header>

      <div className="mt-4 h-64">
        {loading || !data ? (
          <ExecutiveSkeleton className="h-full w-full" />
        ) : chartData.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">
            Sem dados patrimoniais cadastrados.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatBRL(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
