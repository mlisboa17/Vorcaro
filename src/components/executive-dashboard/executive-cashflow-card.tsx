"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CashFlowProjectionDTO } from "@/types/cashflow";
import { ExecutiveSkeleton, formatBRL } from "./executive-shared";

interface ExecutiveCashflowCardProps {
  projection: CashFlowProjectionDTO | null;
  loading?: boolean;
}

function build90DaySeries(projection: CashFlowProjectionDTO) {
  const today = new Date();
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const dayMs = 24 * 60 * 60 * 1000;
  const horizonDays = 90;

  const eventsByDay = new Map<number, number>();
  for (const event of projection.eventos) {
    const eventDay = Date.parse(`${event.data}T12:00:00.000Z`);
    if (eventDay < start || eventDay > start + horizonDays * dayMs) continue;
    eventsByDay.set(eventDay, (eventsByDay.get(eventDay) ?? 0) + event.valor);
  }

  const points: { label: string; saldo: number }[] = [];
  let running = projection.saldoAtual;

  for (let offset = 0; offset <= horizonDays; offset += 7) {
    const dayTs = start + offset * dayMs;
    for (let d = points.length === 0 ? 0 : (points.length - 1) * 7 + 1; d <= offset; d += 1) {
      const ts = start + d * dayMs;
      running += eventsByDay.get(ts) ?? 0;
    }

    const date = new Date(dayTs);
    const label = `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    points.push({ label, saldo: running });
  }

  if (points.length > 0) {
    points[points.length - 1] = {
      label: "+90d",
      saldo: projection.previsao90Dias,
    };
  }

  return points;
}

export function ExecutiveCashflowCard({ projection, loading }: ExecutiveCashflowCardProps) {
  const series = useMemo(() => (projection ? build90DaySeries(projection) : []), [projection]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header>
        <h2 className="text-sm font-semibold text-slate-900">Fluxo de caixa projetado (90 dias)</h2>
        <p className="mt-1 text-xs text-slate-500">Evolução estimada com base em compromissos futuros.</p>
      </header>

      <div className="mt-4 h-64">
        {loading || !projection ? (
          <ExecutiveSkeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="execCashGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#64748b" />
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
              <Area
                type="monotone"
                dataKey="saldo"
                stroke="#0f766e"
                fill="url(#execCashGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
