"use client";

import Link from "next/link";
import { Loader2, Plus, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RECEIVABLE_STATUS_LABELS,
  type ReceivableDto,
  type ReceivableSummaryDto,
} from "@/types/receivables";
import { SettingsToastProvider, useSettingsToast } from "@/components/settings/settings-toast";
import { cn } from "@/lib/utils/cn";

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

function ReceivablesDashboardInner() {
  const { pushToast } = useSettingsToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReceivableDto[]>([]);
  const [summary, setSummary] = useState<ReceivableSummaryDto | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [collectId, setCollectId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [descricao, setDescricao] = useState("");
  const [devedorNome, setDevedorNome] = useState("");
  const [valorOriginal, setValorOriginal] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [collectAmount, setCollectAmount] = useState("");
  const [collectAccountId, setCollectAccountId] = useState("");
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recvRes, accountsRes] = await Promise.all([
        fetch("/api/receivables"),
        fetch("/api/config/contas"),
      ]);
      if (!recvRes.ok) throw new Error("Falha ao carregar contas a receber.");
      const payload = (await recvRes.json()) as {
        items: ReceivableDto[];
        summary: ReceivableSummaryDto;
      };
      setItems(payload.items);
      setSummary(payload.summary);

      if (accountsRes.ok) {
        const accountsPayload = (await accountsRes.json()) as Array<{ id: string; name: string }>;
        setAccounts(accountsPayload.filter((a) => a.id));
      }
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openItems = useMemo(
    () => items.filter((item) => item.status === "OPEN" || item.status === "PARTIALLY_RECEIVED"),
    [items],
  );

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/receivables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao,
          devedorNome,
          valorOriginal: Number(valorOriginal.replace(",", ".")),
          expectedDate: expectedDate || undefined,
          origem: "MANUAL",
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Não foi possível criar.");
      }
      pushToast("success", "Conta a receber registrada.");
      setShowForm(false);
      setDescricao("");
      setDevedorNome("");
      setValorOriginal("");
      setExpectedDate("");
      await load();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao criar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCollect(event: React.FormEvent) {
    event.preventDefault();
    if (!collectId) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/receivables/${collectId}?action=collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(collectAmount.replace(",", ".")),
          accountId: collectAccountId,
          date: new Date().toISOString().slice(0, 10),
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Falha ao registrar recebimento.");
      }
      pushToast("success", "Recebimento registrado.");
      setCollectId(null);
      setCollectAmount("");
      await load();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro no recebimento.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id: string) {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/receivables/${id}?action=cancel`, { method: "POST" });
      if (!response.ok) throw new Error("Falha ao cancelar.");
      pushToast("success", "Conta cancelada.");
      await load();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Erro ao cancelar.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contas a Receber</h1>
          <p className="mt-1 text-sm text-slate-500">
            Compras para terceiros e reembolsos pendentes — ativos, não despesas pessoais.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Nova conta
        </button>
      </header>

      {summary ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total a receber</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{formatBRL(summary.totalPendente)}</p>
          </article>
          <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-emerald-800">Recebido</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-950">{formatBRL(summary.totalRecebido)}</p>
          </article>
          <article className="rounded-xl border border-sky-200 bg-sky-50 p-5">
            <p className="text-sm text-sky-800">Pendente</p>
            <p className="mt-2 text-2xl font-semibold text-sky-950">{formatBRL(summary.totalPendente)}</p>
          </article>
          <article className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm text-amber-800">Vencidos</p>
            <p className="mt-2 text-2xl font-semibold text-amber-950">{formatBRL(summary.totalVencido)}</p>
          </article>
        </section>
      ) : null}

      {showForm ? (
        <form
          onSubmit={(event) => void handleCreate(event)}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">Registrar conta a receber</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-600">Descrição</span>
              <input
                required
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Devedor</span>
              <input
                required
                value={devedorNome}
                onChange={(e) => setDevedorNome(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Valor original</span>
              <input
                required
                value={valorOriginal}
                onChange={(e) => setValorOriginal(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Data prevista</span>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Salvar
          </button>
        </form>
      ) : null}

      {collectId ? (
        <form
          onSubmit={(event) => void handleCollect(event)}
          className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5"
        >
          <h2 className="text-sm font-semibold text-emerald-950">Registrar recebimento</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-600">Valor recebido</span>
              <input
                required
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Conta de entrada</span>
              <select
                required
                value={collectAccountId}
                onChange={(e) => setCollectAccountId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Selecione…</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
            >
              Confirmar recebimento
            </button>
            <button
              type="button"
              onClick={() => setCollectId(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Devedor</th>
                <th className="px-4 py-3">Original</th>
                <th className="px-4 py-3">Recebido</th>
                <th className="px-4 py-3">Pendente</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data prevista</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Nenhuma conta a receber. Marque uma transação como compra para terceiro ou crie manualmente.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.descricao}</td>
                    <td className="px-4 py-3">{item.devedorNome}</td>
                    <td className="px-4 py-3">{formatBRL(item.valorOriginal)}</td>
                    <td className="px-4 py-3">{formatBRL(item.valorRecebido)}</td>
                    <td className="px-4 py-3">{formatBRL(item.valorPendente)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          item.status === "RECEIVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.status === "CANCELLED"
                              ? "bg-slate-100 text-slate-600"
                              : item.vencido
                                ? "bg-amber-100 text-amber-900"
                                : "bg-sky-100 text-sky-900",
                        )}
                      >
                        {RECEIVABLE_STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDate(item.expectedDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {item.status === "OPEN" || item.status === "PARTIALLY_RECEIVED" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setCollectId(item.id);
                                setCollectAmount(String(item.valorPendente));
                              }}
                              className="text-xs font-medium text-emerald-700 hover:underline"
                            >
                              Receber
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCancel(item.id)}
                              className="text-xs font-medium text-slate-600 hover:underline"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : null}
                        {item.transactionId ? (
                          <Link
                            href={`/dashboard/transactions?highlight=${item.transactionId}`}
                            className="text-xs text-slate-500 hover:underline"
                          >
                            Ver lançamento
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {openItems.length > 0 ? (
        <p className="text-xs text-slate-500">
          <Wallet className="mr-1 inline h-3.5 w-3.5" />
          {openItems.length} conta(s) em aberto entram no patrimônio líquido como ativo a receber.
        </p>
      ) : null}
    </div>
  );
}

export function ReceivablesDashboard() {
  return (
    <SettingsToastProvider>
      <ReceivablesDashboardInner />
    </SettingsToastProvider>
  );
}
