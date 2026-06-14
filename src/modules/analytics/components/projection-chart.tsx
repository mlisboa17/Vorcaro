"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProjectionPoint } from "../services/get-cashflow-projection";

interface ProjectionChartProps {
  data: ProjectionPoint[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 1,
  }).format(value);

export function ProjectionChart({ data }: ProjectionChartProps) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-500">Sem dados de projeção.</p>;
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            tickFormatter={(value: number) => formatCompactCurrency(value)}
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip
            formatter={(value) => {
              const num = Number(value);
              return [formatCurrency(Number.isFinite(num) ? num : 0), "Saldo Previsto"];
            }}
            labelFormatter={(label) => `Mês: ${String(label)}`}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 8px 24px -12px rgb(15 23 42 / 0.25)",
            }}
          />
          <Area
            type="monotone"
            dataKey="saldoProjetado"
            stroke="#0ea5e9"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorSaldo)"
            activeDot={{ r: 6, strokeWidth: 0, fill: "#0284c7" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
