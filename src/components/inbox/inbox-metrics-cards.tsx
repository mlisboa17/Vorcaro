"use client";

import type { InboxItem } from "@/types/inbox";
import { METRIC_STATUSES } from "@/types/inbox.constants";
import { cn } from "@/lib/utils/cn";

interface InboxMetricsCardsProps {
  items: InboxItem[];
  className?: string;
}

const METRIC_LABELS: Record<(typeof METRIC_STATUSES)[number], string> = {
  PENDING: "Pendentes",
  PROCESSING: "Processando",
  NEEDS_CONFIRMATION: "Revisão",
  SAVED: "Efetivados",
};

const METRIC_COLORS: Record<(typeof METRIC_STATUSES)[number], string> = {
  PENDING: "border-slate-200 bg-white",
  PROCESSING: "border-blue-200 bg-blue-50/50",
  NEEDS_CONFIRMATION: "border-amber-200 bg-amber-50/50",
  SAVED: "border-green-200 bg-green-50/50",
};

export function InboxMetricsCards({ items, className }: InboxMetricsCardsProps) {
  const counts = METRIC_STATUSES.reduce(
    (acc, status) => {
      acc[status] = items.filter((item) => item.status === status).length;
      return acc;
    },
    {} as Record<(typeof METRIC_STATUSES)[number], number>,
  );

  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {METRIC_STATUSES.map((status) => (
        <div
          key={status}
          className={cn(
            "rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md",
            METRIC_COLORS[status],
          )}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {METRIC_LABELS[status]}
          </p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{counts[status]}</p>
        </div>
      ))}
    </div>
  );
}
