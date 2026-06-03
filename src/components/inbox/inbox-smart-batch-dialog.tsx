"use client";

import type { SmartBatchTierPlan } from "@/modules/inbox-intelligence/domain/types/inbox-automation-policy";
import {
  AUTO_EFFECTUATE_THRESHOLD,
  summarizeCategoryGroups,
} from "@/modules/inbox-intelligence/domain/types/inbox-automation-policy";
import { CheckCircle2, Eye, Loader2, Sparkles, X } from "lucide-react";

interface InboxSmartBatchDialogProps {
  open: boolean;
  tier: "auto" | "batch";
  plan: SmartBatchTierPlan;
  submitting: boolean;
  onConfirmAll: () => void;
  onReview: () => void;
  onCancel: () => void;
}

export function InboxSmartBatchDialog({
  open,
  tier,
  plan,
  submitting,
  onConfirmAll,
  onReview,
  onCancel,
}: InboxSmartBatchDialogProps) {
  if (!open || plan.inboxItemIds.length === 0) return null;

  const count = plan.inboxItemIds.length;
  const groups = summarizeCategoryGroups(plan.groups);
  const isAutoTier = tier === "auto";

  const title = isAutoTier
    ? `Reconheci ${count} transação${count === 1 ? "" : "ões"} com confiança superior a ${AUTO_EFFECTUATE_THRESHOLD}%.`
    : `Identifiquei ${count} transação${count === 1 ? "" : "ões"} com alta probabilidade de classificação correta.`;

  const confirmLabel = isAutoTier ? "Efetivar todas" : "Sim, efetivar todas";

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/50 p-4">
      <div
        className="w-full max-w-lg rounded-xl border border-violet-200 bg-white shadow-2xl"
        role="dialog"
        aria-labelledby="smart-batch-title"
        aria-modal="true"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-violet-100 p-2 text-violet-700">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 id="smart-batch-title" className="text-base font-semibold text-slate-900">
                Confirmação inteligente em lote
              </h2>
              <p className="mt-1 text-sm text-slate-600">{title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded p-1 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Resumo</p>
            <ul className="mt-2 space-y-1.5">
              {groups.map((group) => (
                <li
                  key={group.label}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="text-slate-700">{group.label}</span>
                  <span className="font-semibold text-slate-900">{group.count}</span>
                </li>
              ))}
            </ul>
          </div>

          {!isAutoTier ? (
            <p className="text-sm text-slate-600">Deseja efetivar todas?</p>
          ) : (
            <p className="text-sm text-slate-600">
              Você pode efetivar agora ou revisar as classificações antes de confirmar.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
          <button
            type="button"
            onClick={onReview}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            <Eye className="h-4 w-4" />
            Revisar classificações
          </button>
          <button
            type="button"
            onClick={onConfirmAll}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
