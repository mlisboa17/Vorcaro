"use client";

import Link from "next/link";
import { BellRing, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_SEVERITY_LABELS,
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_TYPE_LABELS,
  type NotificationListResponse,
} from "@/types/notifications";
import type {
  NotificationChannel,
  NotificationSeverity,
  NotificationStatus,
  NotificationType,
} from "@/modules/notifications/domain/types/notification";
import { cn } from "@/lib/utils/cn";

type TabFilter = "unread" | "read" | "dismissed";

const SEVERITY_STYLES: Record<NotificationSeverity, string> = {
  INFO: "border-slate-200 bg-slate-50",
  WARNING: "border-amber-200 bg-amber-50",
  CRITICAL: "border-rose-300 bg-rose-50",
};

function tabToStatus(tab: TabFilter): NotificationStatus | NotificationStatus[] {
  if (tab === "unread") return ["PENDING", "SENT"];
  if (tab === "read") return "READ";
  return "DISMISSED";
}

export function NotificationsDashboard() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationListResponse["items"]>([]);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<TabFilter>("unread");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "ALL">("ALL");
  const [channelFilter, setChannelFilter] = useState<NotificationChannel | "ALL">("ALL");
  const [severityFilter, setSeverityFilter] = useState<NotificationSeverity | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "50" });
      const status = tabToStatus(tab);
      if (Array.isArray(status)) {
        params.set("status", "UNREAD");
      } else {
        params.set("status", status);
      }
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (channelFilter !== "ALL") params.set("channel", channelFilter);
      if (severityFilter !== "ALL") params.set("severity", severityFilter);

      const response = await fetch(`/api/notifications?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Falha ao carregar notificações.");
      const payload = (await response.json()) as NotificationListResponse;
      const filtered = search.trim()
        ? payload.items.filter(
            (i) =>
              i.title.toLowerCase().includes(search.toLowerCase()) ||
              i.message.toLowerCase().includes(search.toLowerCase()),
          )
        : payload.items;
      setItems(filtered);
      setTotal(payload.total);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao carregar.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab, typeFilter, channelFilter, severityFilter, search]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  async function patchNotification(id: string, action: "read" | "dismiss") {
    const response = await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!response.ok) {
      setMessage("Falha ao atualizar notificação.");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-slate-900">
          <BellRing className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight">Central de Notificações</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Alertas, oportunidades e resumos proativos do LOGOS.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["unread", "Não lidas"],
            ["read", "Lidas"],
            ["dismissed", "Descartadas"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              tab === value ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs text-slate-500">
          Tipo
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as NotificationType | "ALL")}
          >
            <option value="ALL">Todos</option>
            {Object.entries(NOTIFICATION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-500">
          Canal
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as NotificationChannel | "ALL")}
          >
            <option value="ALL">Todos</option>
            {Object.entries(NOTIFICATION_CHANNEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-500">
          Severidade
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as NotificationSeverity | "ALL")}
          >
            <option value="ALL">Todas</option>
            {Object.entries(NOTIFICATION_SEVERITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-500">
          Busca
          <div className="relative mt-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Título ou mensagem"
            />
          </div>
        </label>
      </div>

      {message ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">{message}</div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
          Nenhuma notificação neste filtro.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn("rounded-xl border p-4 shadow-sm", SEVERITY_STYLES[item.severity])}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{item.title}</h2>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{item.message}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                    <span>{NOTIFICATION_TYPE_LABELS[item.type]}</span>
                    <span>·</span>
                    <span>{NOTIFICATION_CHANNEL_LABELS[item.channel]}</span>
                    <span>·</span>
                    <span>{NOTIFICATION_STATUS_LABELS[item.status]}</span>
                  </div>
                  {item.actionUrl ? (
                    <Link href={item.actionUrl} className="mt-2 inline-block text-sm text-emerald-700 underline">
                      Ver detalhes
                    </Link>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {item.status !== "READ" && item.status !== "DISMISSED" ? (
                    <button
                      type="button"
                      onClick={() => patchNotification(item.id, "read")}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium ring-1 ring-slate-200"
                    >
                      Marcar lida
                    </button>
                  ) : null}
                  {item.status !== "DISMISSED" ? (
                    <button
                      type="button"
                      onClick={() => patchNotification(item.id, "dismiss")}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200"
                    >
                      Descartar
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-slate-400">{total} notificação(ões) no total</p>
    </div>
  );
}
