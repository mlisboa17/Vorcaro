"use client";

import { Loader2, X } from "lucide-react";

interface InboxBulkConfirmDialogProps {
  open: boolean;
  selectedCount: number;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function InboxBulkConfirmDialog({
  open,
  selectedCount,
  submitting,
  onClose,
  onConfirm,
}: InboxBulkConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl"
        role="dialog"
        aria-labelledby="bulk-confirm-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="bulk-confirm-title" className="text-base font-semibold text-slate-900">
            Efetivar selecionados
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded p-1 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm text-slate-700">
          <p>
            Você está prestes a efetivar{" "}
            <strong>{selectedCount}</strong>{" "}
            {selectedCount === 1 ? "lançamento" : "lançamentos"} usando os dados já extraídos
            (categoria, conta, valor, data).
          </p>
          <p className="text-slate-500">
            Itens incompletos ou sem extração válida falharão — use &quot;Editar em lote&quot;
            antes, se necessário.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Efetivar agora
          </button>
        </div>
      </div>
    </div>
  );
}
