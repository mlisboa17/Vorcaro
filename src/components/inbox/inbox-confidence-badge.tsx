"use client";

import {
  confidenceBand,
  confidenceBandLabel,
} from "@/modules/inbox-intelligence/domain/types/inbox-classification";
import { cn } from "@/lib/utils/cn";
import { AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";

interface InboxConfidenceBadgeProps {
  score: number;
  className?: string;
}

export function InboxConfidenceBadge({ score, className }: InboxConfidenceBadgeProps) {
  const band = confidenceBand(score);
  const label = confidenceBandLabel(band);

  const styles =
    band === "high"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
      : band === "medium"
        ? "border-amber-300 bg-amber-50 text-amber-900"
        : "border-red-200 bg-red-50 text-red-800";

  const Icon = band === "high" ? CheckCircle2 : band === "medium" ? AlertCircle : HelpCircle;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        styles,
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {label} · {score}%
    </span>
  );
}
