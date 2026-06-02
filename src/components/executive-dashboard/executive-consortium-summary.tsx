"use client";

import type { ExecutiveDashboardDTO } from "@/types/executive-dashboard";
import { ExecutiveSkeleton, formatBRL } from "./executive-shared";

interface ExecutiveConsortiumSummaryProps {
  consortium: ExecutiveDashboardDTO["consortium"] | undefined;
  loading?: boolean;
}

export function ExecutiveConsortiumSummary({ consortium, loading }: ExecutiveConsortiumSummaryProps) {
  if (loading || !consortium) {
    return (
      <section className="grid gap-4 sm:grid-cols-3">
        <ExecutiveSkeleton className="h-24" />
        <ExecutiveSkeleton className="h-24" />
        <ExecutiveSkeleton className="h-24" />
      </section>
    );
  }

  const cards = [
    { label: "Consórcios ativos", value: String(consortium.consorciosAtivos) },
    { label: "Crédito total", value: formatBRL(consortium.creditoTotalConsorcio) },
    { label: "Valor pago", value: formatBRL(consortium.valorPagoConsorcio) },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Consórcios</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <article key={card.label} className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{card.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
