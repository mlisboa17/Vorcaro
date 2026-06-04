"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type FollowUpItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  nextCheckAt: string;
  lastReminderAt: string | null;
  checkCount: number;
  createdAt: string;
};

const STATUS_TABS = [
  { key: "", label: "Todos" },
  { key: "PENDING", label: "Pendentes" },
  { key: "ACTIVE", label: "Ativos" },
  { key: "COMPLETED", label: "Concluídos" },
  { key: "DISMISSED", label: "Dispensados" },
  { key: "EXPIRED", label: "Expirados" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  ACTIVE: "bg-blue-100 text-blue-900",
  COMPLETED: "bg-emerald-100 text-emerald-900",
  DISMISSED: "bg-slate-200 text-slate-700",
  EXPIRED: "bg-slate-100 text-slate-600",
};

export function VorcaroFollowupsDashboard() {
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [items, setItems] = useState<FollowUpItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/vorcaro/followups${qs}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function dismiss(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/vorcaro/followups/${id}/dismiss`, {
        method: "POST",
        credentials: "include",
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Acompanhamentos inteligentes após ações assistidas. O Vorcaro lembra e sugere — sem alterar
        dados financeiros automaticamente.
      </p>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key || "all"}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              statusFilter === tab.key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando pendências…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma pendência encontrada para este filtro.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[item.status] ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {item.status}
                  </span>
                  {item.relatedEntityType && (
                    <span className="text-xs text-slate-400">{item.relatedEntityType}</span>
                  )}
                </div>
                <h3 className="font-medium text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
                <p className="text-xs text-slate-400">
                  Lembretes: {item.checkCount} · Próximo:{" "}
                  {new Date(item.nextCheckAt).toLocaleString("pt-BR")}
                </p>
              </div>
              {(item.status === "PENDING" || item.status === "ACTIVE") && (
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => dismiss(item.id)}
                  className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {busyId === item.id ? "…" : "Dispensar"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
