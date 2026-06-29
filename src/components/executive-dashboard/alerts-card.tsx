"use client";

import Link from "next/link";
import { Bell, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type Summary = {
  totalOpen: number;
  totalCritical: number;
  bySeverity: { WARNING: number; CRITICAL: number; INFO: number };
};

export function ExecutiveAlertsCard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    void fetch("/api/alerts/summary", { credentials: "include" })
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

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Bell className="h-4 w-4 text-rose-600" />
          Alertas Financeiros
        </h2>
        <Link
          href="/dashboard/notifications"
          className="text-xs font-medium text-emerald-600 hover:underline"
        >
          Ver todos
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-2xl font-bold text-rose-700">{summary.bySeverity.CRITICAL}</p>
          <p className="text-xs text-slate-500">Críticos</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-amber-600">{summary.bySeverity.WARNING}</p>
          <p className="text-xs text-slate-500">Warnings</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-800">{summary.totalOpen}</p>
          <p className="text-xs text-slate-500">Total aberto</p>
        </div>
      </div>
    </section>
  );
}

export default ExecutiveAlertsCard;
