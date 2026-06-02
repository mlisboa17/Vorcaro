"use client";

import { cn } from "@/lib/utils/cn";

interface SettingsStatusBadgeProps {
  active: boolean;
  className?: string;
}

export function SettingsStatusBadge({ active, className }: SettingsStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
        active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600",
        className,
      )}
    >
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}
