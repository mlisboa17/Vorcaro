"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  CategoryInsight,
  MonthlyInsight,
} from "../services/get-dashboard-insights";

const PIE_COLORS = ["#0f766e", "#2563eb", "#7c3aed", "#db2777", "#ea580c"];

const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export interface DashboardChartsProps {
  monthly: MonthlyInsight[];
  topCategories: CategoryInsight[];
  year: number;
  month: number;
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

const formatPercent = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(value / 100);

type ChartMonthRow = MonthlyInsight & { label: string };

export function DashboardCharts({ monthly, topCategories, year, month }: DashboardChartsProps) {
  const chartMonthly: ChartMonthRow[] = monthly.map((row) => ({
    ...row,
    label: MONTH_SHORT[row.monthIndex - 1] ?? String(row.monthIndex),
  }));

  const hasMonthlyData = monthly.some((row) => row.income > 0 || row.expense > 0);
  const hasTopCategories = topCategories.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:col-span-2">
        <h2 className="text-base font-semibold text-slate-900">Receita vs despesa · {year}</h2>
        <p className="mt-1 text-sm text-slate-500">Comparativo mensal com saldo acumulado.</p>

        {!hasMonthlyData ? (
          <p className="mt-8 text-sm text-slate-500">Nenhum lançamento encontrado para este ano.</p>
        ) : (
          <div className="mt-6 h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartMonthly} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value: number) => formatCompactCurrency(value)}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const num = Number(value);
                    const labels: Record<string, string> = {
                      income: "Receitas",
                      expense: "Despesas",
                      balance: "Saldo",
                    };
                    return [formatCurrency(Number.isFinite(num) ? num : 0), labels[String(name)] ?? String(name)];
                  }}
                  labelFormatter={(label) => `Mês: ${String(label)}`}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px -12px rgb(15 23 42 / 0.25)",
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                />
                <Bar dataKey="income" name="Receitas" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" name="Despesas" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Saldo"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-base font-semibold text-slate-900">Top categorias</h2>
        <p className="mt-1 text-sm text-slate-500">
          Despesas de {String(month).padStart(2, "0")}/{year}
        </p>

        {!hasTopCategories ? (
          <p className="mt-8 text-sm text-slate-500">Nenhuma despesa categorizada neste mês.</p>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topCategories}
                    dataKey="amount"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {topCategories.map((entry, index) => (
                      <Cell key={entry.categoryId} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _name, item) => {
                      const payload = item?.payload as CategoryInsight | undefined;
                      const num = Number(value);
                      const pct = payload?.percentage ?? 0;
                      return [
                        `${formatCurrency(Number.isFinite(num) ? num : 0)} (${formatPercent(pct)})`,
                        payload?.categoryName ?? "Categoria",
                      ];
                    }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 8px 24px -12px rgb(15 23 42 / 0.25)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="space-y-2 text-sm">
              {topCategories.map((category, index) => (
                <li key={category.categoryId} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-slate-700">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    <span className="truncate">{category.categoryName}</span>
                  </span>
                  <span className="shrink-0 font-medium text-slate-900">
                    {formatPercent(category.percentage)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
