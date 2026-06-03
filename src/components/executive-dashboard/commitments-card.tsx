"use client";

import Link from "next/link";
import { CalendarClock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { MonthlyCommitmentsSummaryDto } from "@/types/commitments";
import { COMMITMENT_ORIGIN_LABELS } from "@/types/commitments";

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function ExecutiveCommitmentsCard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<MonthlyCommitmentsSummaryDto | null>(null);

  useEffect(() => {
    void fetch("/api/commitments/monthly", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setSummary(j))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </section>
    );
  }

  if (!summary) return null;

  const topOrigin = summary.byOrigin[0];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <CalendarClock className="h-4 w-4 text-emerald-600" />
          Compromissos do Mês
        </h2>
        <Link
          href="/dashboard/commitments"
          className="text-xs font-medium text-emerald-600 hover:underline"
        >
          Ver central
        </Link>
      </div>
      <p className="text-2xl font-bold text-rose-700">{formatBRL(summary.totalOutflows)}</p>
      <p className="text-xs text-slate-500">saídas comprometidas</p>
      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p>
          <span className="font-medium text-slate-800">Entradas previstas:</span>{" "}
          {formatBRL(summary.totalInflows)}
        </p>
        <p>
          <span className="font-medium text-slate-800">Vencidos:</span> {summary.overdueCount}
        </p>
        <p>
          <span className="font-medium text-slate-800">Próximos 7 dias:</span>{" "}
          {summary.next7DaysCount}
        </p>
        {topOrigin ? (
          <p>
            <span className="font-medium text-slate-800">Maior origem:</span>{" "}
            {COMMITMENT_ORIGIN_LABELS[topOrigin.origin as keyof typeof COMMITMENT_ORIGIN_LABELS] ??
              topOrigin.origin}{" "}
            ({formatBRL(topOrigin.total)})
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default ExecutiveCommitmentsCard;
