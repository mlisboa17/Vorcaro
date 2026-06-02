"use client";

import { Loader2, X } from "lucide-react";

interface BulkDeleteTransactionsModalProps {
  open: boolean;
  count: number;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function BulkDeleteTransactionsModal({
  open,
  count,
  deleting,
  onClose,
  onConfirm,
}: BulkDeleteTransactionsModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-delete-title"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="bulk-delete-title" className="text-lg font-semibold text-slate-900">
            Excluir lançamentos em lote
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-600">
          {count} {count === 1 ? "lançamento será excluído" : "lançamentos serão excluídos"}. Esta
          ação não pode ser desfeita. Lançamentos vindos da Caixa Financeira podem voltar para
          revisão.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Excluir {count} lançamentos
          </button>
        </div>
      </div>
    </div>
  );
}
