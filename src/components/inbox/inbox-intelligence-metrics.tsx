"use client";

import type { InboxIntelligenceMetrics } from "@/modules/inbox-intelligence/application/services/inbox-intelligence-metrics.service";
import { cn } from "@/lib/utils/cn";

interface InboxIntelligenceMetricsProps {
  metrics: InboxIntelligenceMetrics | null;
  className?: string;
}

export function InboxIntelligenceMetricsCards({ metrics, className }: InboxIntelligenceMetricsProps) {
  if (!metrics) return null;

  const cards = [
    {
      label: "Taxa de acerto da IA",
      value: metrics.accuracyRatePercent != null ? `${metrics.accuracyRatePercent}%` : "—",
      hint: "Estimativa com base no histórico",
    },
    {
      label: "Categorias aprendidas",
      value: String(metrics.learnedPatternsCount),
      hint: "Padrões do seu histórico",
    },
    {
      label: "Sugestões aceitas",
      value: String(metrics.suggestionsAcceptedEstimate),
      hint: "Ocorrências reforçadas",
    },
    {
      label: "Sugestões corrigidas",
      value: String(metrics.suggestionsCorrected),
      hint: "Quando você alterou a sugestão",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700/80">
            {card.label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{card.value}</p>
          <p className="mt-1 text-[11px] text-slate-500">{card.hint}</p>
        </div>
      ))}
    </div>
  );
}
