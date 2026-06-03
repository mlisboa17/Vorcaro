"use client";

import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { InstallmentGroupDetailDto } from "@/modules/installments/domain/types/installment-group.dto";
import { cn } from "@/lib/utils/cn";

type Props = {
  groupId: string | null;
  onClose: () => void;
};

function formatBrl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusLabel(status: InstallmentGroupDetailDto["transactions"][0]["status"]) {
  if (status === "PAID") return { text: "Paga", className: "bg-slate-200 text-slate-700" };
  if (status === "OVERDUE") return { text: "Atrasada", className: "bg-rose-100 text-rose-800" };
  return { text: "Em aberto", className: "bg-emerald-100 text-emerald-800" };
}

export function InstallmentGroupDetailModal({ groupId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<InstallmentGroupDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);

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
                  return (
                    <li
                      key={tx.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                    >
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
                      </div>
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
