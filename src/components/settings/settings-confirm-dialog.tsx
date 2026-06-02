"use client";

import { Loader2 } from "lucide-react";

interface SettingsConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SettingsConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  loading = false,
  destructive = false,
  onConfirm,
  onCancel,
}: SettingsConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Fechar confirmação"
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="alertdialog"
          aria-modal="true"
          className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
        >
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={
                destructive
                  ? "inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  : "inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              }
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
