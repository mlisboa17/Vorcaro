"use client";

import type { TransactionListItem } from "@/types/transactions";
import { Loader2, X } from "lucide-react";

interface DeleteTransactionModalProps {
  item: TransactionListItem | null;
  open: boolean;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteTransactionModal({
  item,
  open,
  deleting,
  onClose,
  onConfirm,
}: DeleteTransactionModalProps) {
  if (!open || !item) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Fechar confirmação"
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-transaction-title"
          className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="delete-transaction-title" className="text-lg font-semibold text-slate-900">
                Excluir lançamento
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Tem certeza que deseja excluir este lançamento?
              </p>
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
                {item.description}
              </p>
              {item.inboxItemId ? (
                <p className="mt-2 text-xs text-slate-500">
                  Se veio da Caixa Financeira, o item voltará para revisão.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Excluir
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
