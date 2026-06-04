"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useState } from "react";
import type { AdvisorConsultationResponse } from "@/types/advisor-consultant";
import { cn } from "@/lib/utils/cn";

type Action = AdvisorConsultationResponse["actions"][number];

type Props = {
  action: Action;
  className?: string;
  onDismissed?: (hash: string) => void;
  onClickTracked?: () => void;
};

export function AdvisorActionRow({ action, className, onDismissed, onClickTracked }: Props) {
  const [dismissing, setDismissing] = useState(false);

  async function handleDismiss() {
    setDismissing(true);
    try {
      const res = await fetch(
        `/api/advisor/actions/${encodeURIComponent(action.recommendationHash)}/dismiss`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            dismissReason: "NOT_RELEVANT",
            actionType: action.type,
          }),
        },
      );
      if (res.ok) onDismissed?.(action.recommendationHash);
    } finally {
      setDismissing(false);
    }
  }

  async function trackClick() {
    onClickTracked?.();
    void fetch(`/api/advisor/actions/${encodeURIComponent(action.recommendationHash)}/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ actionType: action.type }),
    });
  }

  const href = action.actionUrl || action.target;

  return (
    <li className={cn("rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-slate-900">{action.title}</p>
        <button
          type="button"
          onClick={() => void handleDismiss()}
          disabled={dismissing}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
          title="Ignorar por 30 dias"
          aria-label="Ignorar recomendação"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-600">{action.objectiveMetric.explanation}</p>
      {action.estimatedImpact > 0 ? (
        <p className="mt-1 text-xs font-semibold text-emerald-700">
          Impacto estimado:{" "}
          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
            action.estimatedImpact,
          )}
        </p>
      ) : null}
      {href ? (
        <Link
          href={href}
          onClick={() => void trackClick()}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
        >
          Abrir
          <ArrowRight className="h-3 w-3" />
        </Link>
      ) : null}
    </li>
  );
}
