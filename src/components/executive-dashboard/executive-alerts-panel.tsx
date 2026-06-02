"use client";

import type { ExecutiveDashboardAlert } from "@/types/executive-dashboard";
import { ExecutiveSkeleton } from "./executive-shared";
import { cn } from "@/lib/utils/cn";

interface ExecutiveAlertsPanelProps {
  alerts: ExecutiveDashboardAlert[];
  loading?: boolean;
}

const SEVERITY_STYLES = {
  CRITICAL: "border-red-200 bg-red-50 text-red-800",
  WARNING: "border-amber-200 bg-amber-50 text-amber-900",
  INFO: "border-blue-200 bg-blue-50 text-blue-900",
} as const;

export function ExecutiveAlertsPanel({ alerts, loading }: ExecutiveAlertsPanelProps) {
  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Alertas executivos</h2>
        <div className="mt-4 space-y-2">
          <ExecutiveSkeleton className="h-10" />
          <ExecutiveSkeleton className="h-10" />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Alertas executivos</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {alerts.length}
        </span>
      </div>

      {alerts.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Nenhum alerta ativo no momento.</p>
      ) : (
        <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
          {alerts.map((alert, index) => (
            <li
              key={`${alert.type}-${index}`}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm",
                SEVERITY_STYLES[alert.severity],
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                  {alert.severity}
                </span>
                <span className="text-[11px] font-medium opacity-80">{alert.type}</span>
              </div>
              <p className="mt-1.5 leading-snug">{alert.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
