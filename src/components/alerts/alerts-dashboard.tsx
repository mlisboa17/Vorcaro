"use client";

import Link from "next/link";
import { AlertTriangle, Bell, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ALERT_SEVERITY_LABELS, ALERT_TYPE_LABELS } from "@/types/financial-alerts";
import type {
  FinancialAlertSeverity,
  FinancialAlertStatus,
  FinancialAlertType,
} from "@/modules/financial-alerts/domain/types/financial-alert";
import { SettingsToastProvider, useSettingsToast } from "@/components/settings/settings-toast";
import { cn } from "@/lib/utils/cn";

type AlertSeverity = FinancialAlertSeverity;
type AlertStatus = FinancialAlertStatus;
type AlertType = FinancialAlertType;

type AlertItem = {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  status: AlertStatus;
  actionUrl: string | null;
  createdAt: string;
};

type ListResponse = {
  items: AlertItem[];
  total: number;
  page: number;
  pageSize: number;
};

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  INFO: "border-slate-200 bg-slate-50",
  WARNING: "border-amber-200 bg-amber-50",
  CRITICAL: "border-rose-300 bg-rose-50",
};

function AlertsDashboardInner() {
  const { pushToast } = useSettingsToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AlertItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "ALL">("OPEN");
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<AlertType | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (severityFilter !== "ALL") params.set("severity", severityFilter);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (search.trim()) params.set("search", search.trim());

      const response = await fetch(`/api/alerts?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Falha ao carregar alertas.");
      const payload = (await response.json()) as ListResponse;
      setItems(payload.items);
      setTotal(payload.total);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao carregar.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, severityFilter, typeFilter, search, pushToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchStatus(id: string, status: AlertStatus) {
    const response = await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      pushToast("error", "Não foi possível atualizar o alerta.");
      return;
    }
    pushToast("success", status === "DISMISSED" ? "Alerta descartado." : "Alerta marcado como resolvido.");
    void load();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
          <Bell className="h-6 w-6 text-emerald-600" />
          Alertas Financeiros
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Riscos, vencimentos e oportunidades detectados automaticamente pelo motor de alertas.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as AlertStatus | "ALL");
          }}
        >
          <option value="ALL">Todos os status</option>
          <option value="OPEN">Abertos</option>
          <option value="DISMISSED">Descartados</option>
          <option value="RESOLVED">Resolvidos</option>
        </select>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={severityFilter}
          onChange={(e) => {
            setPage(1);
            setSeverityFilter(e.target.value as AlertSeverity | "ALL");
          }}
        >
          <option value="ALL">Todas severidades</option>
          <option value="CRITICAL">Crítico</option>
          <option value="WARNING">Atenção</option>
          <option value="INFO">Info</option>
        </select>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={typeFilter}
          onChange={(e) => {
            setPage(1);
            setTypeFilter(e.target.value as AlertType | "ALL");
          }}
        >
          <option value="ALL">Todos os tipos</option>
          {Object.entries(ALERT_TYPE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
            placeholder="Buscar título ou descrição..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Nenhum alerta encontrado com os filtros atuais.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((alert) => (
            <li
              key={alert.id}
              className={cn(
                "rounded-xl border p-4 shadow-sm",
                SEVERITY_STYLES[alert.severity],
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 font-semibold text-slate-900">
                    {alert.severity === "CRITICAL" ? (
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                    ) : null}
                    {alert.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {ALERT_TYPE_LABELS[alert.type] ?? alert.type} ·{" "}
                    {ALERT_SEVERITY_LABELS[alert.severity]} ·{" "}
                    {new Date(alert.createdAt).toLocaleString("pt-BR")}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">{alert.description}</p>
                  {alert.actionUrl ? (
                    <Link
                      href={alert.actionUrl}
                      className="mt-2 inline-block text-xs font-medium text-emerald-600 hover:underline"
                    >
                      Ver detalhes
                    </Link>
                  ) : null}
                </div>
                {alert.status === "OPEN" ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => void patchStatus(alert.id, "DISMISSED")}
                    >
                      Descartar
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                      onClick={() => void patchStatus(alert.id, "RESOLVED")}
                    >
                      Resolver
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Página {page} de {totalPages} ({total} alertas)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              className="rounded border px-3 py-1 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              className="rounded border px-3 py-1 disabled:opacity-40"
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AlertsDashboard() {
  return (
    <SettingsToastProvider>
      <AlertsDashboardInner />
    </SettingsToastProvider>
  );
}

export default AlertsDashboard;
