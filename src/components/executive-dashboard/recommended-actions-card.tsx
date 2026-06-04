"use client";

import Link from "next/link";
import { Loader2, ListChecks } from "lucide-react";
import { AdvisorActionRow } from "@/components/advisor/advisor-action-row";
import { useEffect, useState } from "react";
import type { AdvisorConsultationResponse } from "@/types/advisor-consultant";
import { cn } from "@/lib/utils/cn";

const PRIORITY_STYLES = {
  CRITICAL: "border-rose-200 bg-rose-50 text-rose-800",
  HIGH: "border-amber-200 bg-amber-50 text-amber-800",
  MEDIUM: "border-slate-200 bg-slate-50 text-slate-700",
  LOW: "border-slate-100 bg-white text-slate-600",
} as const;

export function ExecutiveRecommendedActionsCard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdvisorConsultationResponse | null>(null);

  useEffect(() => {
    void fetch("/api/advisor/consultation", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setData(j))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </section>
    );
  }

  if (!data) return null;

  const topActions = data.actions.slice(0, 3);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ListChecks className="h-4 w-4 text-violet-600" />
          Próximas Ações Recomendadas
        </h2>
        <Link
          href="/dashboard/advisor"
          className="text-xs font-medium text-emerald-600 hover:underline"
        >
          Ver Vorcaro
        </Link>
      </div>

      {topActions.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma ação pendente no momento.</p>
      ) : (
        <ul className="space-y-3">
          {topActions.map((action) => (
            <AdvisorActionRow
              key={action.recommendationHash}
              action={action}
              className={cn(PRIORITY_STYLES[action.priority], "border")}
              onDismissed={(hash) =>
                setData((prev) =>
                  prev
                    ? { ...prev, actions: prev.actions.filter((a) => a.recommendationHash !== hash) }
                    : prev,
                )
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default ExecutiveRecommendedActionsCard;
