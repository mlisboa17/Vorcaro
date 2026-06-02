"use client";

import { Pencil, Trash2, X } from "lucide-react";

interface TransactionBulkSelectionBarProps {
  selectedCount: number;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function TransactionBulkSelectionBar({
  selectedCount,
  busy,
  onEdit,
  onDelete,
  onClear,
}: TransactionBulkSelectionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-900">
          {selectedCount} {selectedCount === 1 ? "lançamento selecionado" : "lançamentos selecionados"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Pencil className="h-4 w-4" />
            Editar em Lote
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Excluir em Lote
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Cancelar Seleção
          </button>
        </div>
      </div>
    </div>
  );
}
