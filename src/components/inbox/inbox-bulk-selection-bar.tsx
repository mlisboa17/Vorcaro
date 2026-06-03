"use client";

import { ArrowLeftRight, CheckCircle2, Pencil, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { getSelectionCounterText } from "@/lib/inbox/inbox-selection";

interface InboxBulkSelectionBarProps {
  selectedCount: number;
  visibleSelectableCount: number;
  totalSelectableCount: number;
  busy?: boolean;
  onConfirm: () => void;
  onBulkEdit: () => void;
  onIgnore: () => void;
  onClear: () => void;
  onInvert: () => void;
  onApplySuggestions?: () => void;
  applySuggestionsDisabled?: boolean;
  confirmDisabled?: boolean;
  confirmDisabledReason?: string;
  ignoreDisabled?: boolean;
  ignoreDisabledReason?: string;
}

export function InboxBulkSelectionBar({
  selectedCount,
  visibleSelectableCount,
  totalSelectableCount,
  busy = false,
  onConfirm,
  onBulkEdit,
  onIgnore,
  onClear,
  onInvert,
  onApplySuggestions,
  applySuggestionsDisabled = false,
  confirmDisabled = false,
  confirmDisabledReason,
  ignoreDisabled = true,
  ignoreDisabledReason = "Disponível na próxima etapa",
}: InboxBulkSelectionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  const counter = getSelectionCounterText({
    selectedCount,
    visibleSelectableCount,
    totalSelectableCount,
  });

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:px-6"
      role="region"
      aria-label="Ações em lote da revisão"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm font-medium text-slate-900">{counter}</p>
        <div className="flex flex-wrap items-center gap-2">
          {onApplySuggestions ? (
            <ActionButton
              icon={<Sparkles className="h-4 w-4" />}
              label="Aplicar sugestões"
              onClick={onApplySuggestions}
              disabled={busy || applySuggestionsDisabled}
            />
          ) : null}
          <ActionButton
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Efetivar selecionados"
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
            title={confirmDisabled ? confirmDisabledReason : undefined}
            variant="primary"
          />
          <ActionButton
            icon={<Pencil className="h-4 w-4" />}
            label="Editar em lote"
            onClick={onBulkEdit}
            disabled={busy}
            variant="primary"
          />
          <ActionButton
            icon={<Trash2 className="h-4 w-4" />}
            label="Ignorar"
            onClick={onIgnore}
            disabled={busy || ignoreDisabled}
            title={ignoreDisabled ? ignoreDisabledReason : undefined}
            variant="danger"
          />
          <ActionButton
            icon={<RotateCcw className="h-4 w-4" />}
            label="Inverter seleção"
            onClick={onInvert}
            disabled={busy}
          />
          <ActionButton
            icon={<ArrowLeftRight className="h-4 w-4" />}
            label="Limpar seleção"
            onClick={onClear}
            disabled={busy}
          />
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  title,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  variant?: "primary" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={
        variant === "primary"
          ? "inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          : variant === "danger"
            ? "inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            : "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.split(" ")[0]}</span>
    </button>
  );
}
