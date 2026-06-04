"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ExternalLink } from "lucide-react";

type ActionItem = {
  id: string;
  actionType: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  executedAt: string | null;
  targetUrl?: string;
};

type ExecutionResult = {
  status: "EXECUTED" | "FAILED";
  targetUrl?: string;
  message: string;
  title: string;
};

const STATUS_TABS = [
  { key: "", label: "Todas" },
  { key: "PENDING", label: "Pendentes" },
  { key: "APPROVED", label: "Aprovadas" },
  { key: "EXECUTED", label: "Executadas" },
  { key: "FAILED", label: "Falhadas" },
  { key: "EXPIRED", label: "Expiradas" },
  { key: "REJECTED", label: "Rejeitadas" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  APPROVED: "bg-blue-100 text-blue-900",
  EXECUTED: "bg-emerald-100 text-emerald-900",
  FAILED: "bg-rose-100 text-rose-900",
  EXPIRED: "bg-slate-100 text-slate-600",
  REJECTED: "bg-slate-200 text-slate-700",
};

export function VorcaroActionsDashboard() {
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [items, setItems] = useState<ActionItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/vorcaro/actions${qs}`, { credentials: "include" });
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

  async function mutate(id: string, action: "approve" | "reject" | "execute") {
    setBusyId(id);
    try {
      await fetch(`/api/vorcaro/actions/${id}/${action}`, {
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
        Assist → Confirm → Execute: o Vorcaro propõe abrir telas no dashboard. Nenhuma alteração
        financeira é feita automaticamente.
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
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando propostas…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma proposta neste filtro.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {item.actionType} · criada{" "}
                    {new Date(item.createdAt).toLocaleString("pt-BR")} · expira{" "}
                    {new Date(item.expiresAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[item.status] ?? "bg-slate-100"
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {item.status === "PENDING" ? (
                  <>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => mutate(item.id, "approve")}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => mutate(item.id, "reject")}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Rejeitar
                    </button>
                  </>
                ) : null}
                {item.status === "APPROVED" ? (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => mutate(item.id, "execute")}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    Executar
                  </button>
                ) : null}
                {item.status === "EXECUTED" && item.targetUrl ? (
                  <Link
                    href={item.targetUrl}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Abrir destino
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
