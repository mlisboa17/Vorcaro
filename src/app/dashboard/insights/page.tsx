import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDashboardInsights } from "@/modules/analytics/services/get-dashboard-insights";
import { getCashflowProjection } from "@/modules/analytics/services/get-cashflow-projection";
import { DashboardCharts } from "@/modules/analytics/components/dashboard-charts";
import { ProjectionChart } from "@/modules/analytics/components/projection-chart";

export const metadata = {
  title: "Insights | Vorcaro",
  description: "Visão anual de receitas, despesas e categorias",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default async function InsightsPage(props: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const year = searchParams.year ? parseInt(searchParams.year, 10) : new Date().getFullYear();
  const month = searchParams.month ? parseInt(searchParams.month, 10) : new Date().getMonth() + 1;

  const insights = await getDashboardInsights(session.user.id, { year, month });
  const { summary } = insights;
  const projectionData = await getCashflowProjection(session.user.id);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-1 py-2">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Insights</h1>
        <p className="mt-1 text-sm text-slate-500">
          Visão anual das receitas, despesas e categorias
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-medium text-slate-500">Receitas no ano</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">
            {formatCurrency(summary.totalIncome)}
          </p>
        </article>
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-medium text-slate-500">Despesas no ano</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">
            {formatCurrency(summary.totalExpense)}
          </p>
        </article>
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-medium text-slate-500">Saldo</p>
          <p
            className={`mt-2 text-2xl font-semibold ${
              summary.balance >= 0 ? "text-slate-900" : "text-red-600"
            }`}
          >
            {formatCurrency(summary.balance)}
          </p>
        </article>
      </section>

      <DashboardCharts
        monthly={insights.monthly}
        topCategories={insights.topCategories}
        year={year}
        month={month}
      />

      <section className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Leitura executiva
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          <li>
            <span className="font-medium text-slate-900">Melhor mês:</span>{" "}
            {summary.bestMonth ?? "Sem dados suficientes"}
          </li>
          <li>
            <span className="font-medium text-slate-900">Pior mês:</span>{" "}
            {summary.worstMonth ?? "Sem dados suficientes"}
          </li>
          <li>
            <span className="font-medium text-slate-900">Categoria que mais pesa:</span>{" "}
            {summary.topCategoryName ?? "Nenhuma despesa categorizada no mês"}
          </li>
        </ul>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-base font-semibold text-slate-900">Projeção de Saldo Acumulado</h2>
        <p className="mt-1 text-sm text-slate-500">
          Visão preditiva baseada nos parcelamentos e recorrências dos próximos 6 meses.
        </p>
        <div className="mt-6">
          <ProjectionChart data={projectionData} />
        </div>
      </section>
    </div>
  );
}
