"use client";

import { Loader2, Pencil, Trash2, X, Check } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { InstallmentGroupDetailDto } from "@/modules/installments/domain/types/installment-group.dto";
import { cn } from "@/lib/utils/cn";

type Props = {
  groupId: string | null;
  onClose: () => void;
};

type TxRow = InstallmentGroupDetailDto["transactions"][0];

function formatBrl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusLabel(status: TxRow["status"]) {
  if (status === "PAID") return { text: "Paga", className: "bg-slate-200 text-slate-700" };
  if (status === "OVERDUE") return { text: "Atrasada", className: "bg-rose-100 text-rose-800" };
  return { text: "Em aberto", className: "bg-emerald-100 text-emerald-800" };
}

type EditState = {
  txId: string;
  description: string;
  amount: string;
  date: string;
  saving: boolean;
  error: string | null;
};

export function InstallmentGroupDetailModal({ groupId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<InstallmentGroupDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/installments/${encodeURIComponent(groupId)}`, {
        credentials: "include",
      });
      if (res.status === 403) throw new Error("Você não tem acesso a este parcelamento.");
      if (res.status === 404) throw new Error("Parcelamento não encontrado.");
      if (!res.ok) throw new Error("Falha ao carregar detalhes.");
      setDetail((await res.json()) as InstallmentGroupDetailDto);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) void load();
    else setDetail(null);
  }, [groupId, load]);

  function openEdit(tx: TxRow) {
    const rawDate = tx.dataVencimentoFatura ?? tx.date;
    const isoDate = rawDate ? rawDate.slice(0, 10) : "";
    setEdit({
      txId: tx.id,
      description: tx.description,
      amount: tx.amount.toFixed(2).replace(".", ","),
      date: isoDate,
      saving: false,
      error: null,
    });
    setConfirmDeleteId(null);
  }

  async function saveEdit() {
    if (!edit) return;
    const amountNum = Number(edit.amount.replace(",", "."));
    if (!amountNum || amountNum <= 0) {
      setEdit((e) => e && { ...e, error: "Valor inválido" });
      return;
    }
    setEdit((e) => e && { ...e, saving: true, error: null });
    try {
      const res = await fetch(`/api/installments/transactions/${edit.txId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: edit.description,
          amount: amountNum,
          date: edit.date,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Erro ao salvar");
      }
      setEdit(null);
      await load();
    } catch (e) {
      setEdit((prev) => prev && { ...prev, saving: false, error: e instanceof Error ? e.message : "Erro" });
    }
  }

  async function confirmDelete(txId: string) {
    setDeletingId(txId);
    try {
      const res = await fetch(`/api/installments/transactions/${txId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Erro ao excluir");
      }
      setConfirmDeleteId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir");
    } finally {
      setDeletingId(null);
    }
  }

  if (!groupId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {detail?.descricao ?? "Detalhe do parcelamento"}
            </h2>
            {detail && (
              <p className="mt-1 text-xs text-slate-500">
                {detail.parcelasPagas}/{detail.totalParcelas} pagas ·{" "}
                <span
                  className={cn(
                    "font-semibold",
                    detail.status === "ATIVO" ? "text-emerald-700" : "text-slate-600",
                  )}
                >
                  {detail.status}
                </span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          )}
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {detail && !loading && (
            <>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <SummaryBox label="Total" value={formatBrl(detail.valorTotal)} />
                <SummaryBox label="Já pago" value={formatBrl(detail.valorPago)} />
                <SummaryBox label="Restante" value={formatBrl(detail.valorRestante)} highlight />
              </div>
              {(detail.cartao || detail.categoria) && (
                <p className="mb-3 text-sm text-slate-600">
                  {detail.cartao && (
                    <>
                      <span className="font-medium">Cartão:</span> {detail.cartao}
                    </>
                  )}
                  {detail.cartao && detail.categoria && " · "}
                  {detail.categoria && (
                    <>
                      <span className="font-medium">Categoria:</span> {detail.categoria}
                    </>
                  )}
                </p>
              )}
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {detail.transactions.map((tx) => {
                  const badge = statusLabel(tx.status);
                  const isEditing = edit?.txId === tx.id;
                  const isConfirmingDelete = confirmDeleteId === tx.id;
                  const canEdit = tx.status !== "PAID";

                  return (
                    <li key={tx.id} className="text-sm">
                      {isEditing ? (
                        <div className="flex flex-col gap-2 px-4 py-3">
                          <div className="flex gap-2">
                            <input
                              className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-violet-500 focus:outline-none"
                              value={edit.description}
                              onChange={(e) => setEdit((prev) => prev && { ...prev, description: e.target.value })}
                              placeholder="Descrição"
                            />
                            <input
                              className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm focus:border-violet-500 focus:outline-none"
                              value={edit.amount}
                              onChange={(e) => setEdit((prev) => prev && { ...prev, amount: e.target.value })}
                              placeholder="0,00"
                            />
                            <input
                              type="date"
                              className="w-36 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-violet-500 focus:outline-none"
                              value={edit.date}
                              onChange={(e) => setEdit((prev) => prev && { ...prev, date: e.target.value })}
                            />
                          </div>
                          {edit.error && (
                            <p className="text-xs text-rose-600">{edit.error}</p>
                          )}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void saveEdit()}
                              disabled={edit.saving}
                              className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                            >
                              {edit.saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEdit(null)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : isConfirmingDelete ? (
                        <div className="flex items-center justify-between gap-2 bg-rose-50 px-4 py-3">
                          <p className="text-xs text-rose-700">Excluir parcela {tx.numeroParcela}? Esta ação não pode ser desfeita.</p>
                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => void confirmDelete(tx.id)}
                              disabled={deletingId === tx.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                              {deletingId === tx.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900">
                              Parcela {tx.numeroParcela ?? "—"}
                              {tx.totalParcelas != null ? ` / ${tx.totalParcelas}` : ""}
                            </p>
                            <p className="text-xs text-slate-500">Vencimento {tx.dataVencimento}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{formatBrl(tx.amount)}</span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-semibold",
                                badge.className,
                              )}
                            >
                              {badge.text}
                            </span>
                            {canEdit && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEdit(tx)}
                                  title="Editar parcela"
                                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setConfirmDeleteId(tx.id); setEdit(null); }}
                                  title="Excluir parcela"
                                  className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2",
        highlight ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50",
      )}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}
