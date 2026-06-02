"use client";

import type { FinanceCatalog } from "@/types/inbox";
import { Loader2, X } from "lucide-react";
import { useState } from "react";

interface InboxBulkReviewModalProps {
  open: boolean;
  selectedIds: string[];
  catalog: FinanceCatalog;
  onClose: () => void;
  onSaved: (result: { updated: number; skipped: number; failed: number }) => void;
}

export function InboxBulkReviewModal({
  open,
  selectedIds,
  catalog,
  onClose,
  onSaved,
}: InboxBulkReviewModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoriaId, setCategoriaId] = useState("");
  const [contaFinanceiraId, setContaFinanceiraId] = useState("");
  const [formaPagamentoId, setFormaPagamentoId] = useState("");
  const [cartaoId, setCartaoId] = useState("");
  const [dataCompra, setDataCompra] = useState("");
  const [dataCaixa, setDataCaixa] = useState("");

  if (!open) return null;

  async function handleSave() {
    setSubmitting(true);
    setError(null);

    try {
      const patch: Record<string, unknown> = {};
      if (categoriaId) patch.categoriaId = categoriaId;
      if (contaFinanceiraId) patch.contaFinanceiraId = contaFinanceiraId;
      if (formaPagamentoId) patch.formaPagamentoId = formaPagamentoId;
      if (cartaoId) patch.cartaoId = cartaoId;
      if (dataCompra) patch.dataCompra = dataCompra;
      if (dataCaixa) patch.dataCaixa = dataCaixa;

      if (Object.keys(patch).length === 0) {
        throw new Error("Informe ao menos um campo para atualizar.");
      }

      const response = await fetch("/api/inbox/bulk-update", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inboxItemIds: selectedIds,
          patch,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Falha ao atualizar itens");
      }

      const payload = (await response.json()) as { updated: number; skipped: number; failed: number };
      onSaved(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Revisão em massa da Caixa</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="rounded border px-3 py-2 text-sm">
            <option value="">Categoria (manter)</option>
            {catalog.categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select value={contaFinanceiraId} onChange={(e) => setContaFinanceiraId(e.target.value)} className="rounded border px-3 py-2 text-sm">
            <option value="">Conta (manter)</option>
            {catalog.accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select value={formaPagamentoId} onChange={(e) => setFormaPagamentoId(e.target.value)} className="rounded border px-3 py-2 text-sm">
            <option value="">Forma de pagamento (manter)</option>
            {catalog.paymentMethods.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select value={cartaoId} onChange={(e) => setCartaoId(e.target.value)} className="rounded border px-3 py-2 text-sm">
            <option value="">Cartão (manter)</option>
            {catalog.cards.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <label className="text-xs text-slate-600">
            Data Compra
            <input type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-slate-600">
            Data Caixa
            <input type="date" value={dataCaixa} onChange={(e) => setDataCaixa(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
          </label>
        </div>

        {error ? <p className="px-5 pb-2 text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded px-3 py-2 text-sm hover:bg-slate-100">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Aplicar em {selectedIds.length}
          </button>
        </div>
      </div>
    </div>
  );
}

