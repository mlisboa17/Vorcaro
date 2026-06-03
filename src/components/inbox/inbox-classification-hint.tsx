"use client";

import type { InboxClassificationSuggestion } from "@/modules/inbox-intelligence/domain/types/inbox-classification";
import { classificationSourceLabel } from "@/modules/inbox-intelligence/domain/types/inbox-classification";
import { InboxConfidenceBadge } from "./inbox-confidence-badge";
import { AlertTriangle, CheckCircle2, HandCoins, Sparkles } from "lucide-react";

interface InboxClassificationHintProps {
  suggestion: InboxClassificationSuggestion | null | undefined;
}

export function InboxClassificationHint({ suggestion }: InboxClassificationHintProps) {
  if (!suggestion?.categoryId && !suggestion?.categoriaPrincipal) {
    if (!suggestion?.possibleDuplicate && !suggestion?.isPotentialReimbursement) {
      return null;
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-700">
      {(suggestion.categoryId || suggestion.categoriaPrincipal) && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-violet-600" aria-hidden />
            <span className="font-medium text-slate-900">Sugestão inteligente</span>
            <InboxConfidenceBadge score={suggestion.confidence} />
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
              {classificationSourceLabel(suggestion.source)}
            </span>
            {suggestion.readyToConfirm ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                <CheckCircle2 className="h-3 w-3" />
                Pronto para efetivar
              </span>
            ) : null}
          </div>
          <dl className="mt-2 grid gap-1 sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Categoria</dt>
              <dd className="font-medium">{suggestion.categoriaPrincipal ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Subcategoria</dt>
              <dd className="font-medium">{suggestion.subcategoria ?? "—"}</dd>
            </div>
          </dl>
          {suggestion.installment?.hadInstallmentMarker ? (
            <p className="mt-2 text-slate-600">
              Parcela {suggestion.installment.numeroParcela}/
              {suggestion.installment.totalParcelas}
              {suggestion.installment.installmentGroup
                ? ` · grupo ${suggestion.installment.installmentGroup}`
                : ""}
            </p>
          ) : null}
          <p className="mt-2 text-slate-600">
            <span className="font-medium text-slate-700">Por que sugerimos isso?</span>{" "}
            {suggestion.explanation}
          </p>
        </>
      )}

      {suggestion.possibleDuplicate ? (
        <p className="mt-2 inline-flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Possível duplicata
            {suggestion.duplicateReason ? ` — ${suggestion.duplicateReason}` : ""}
          </span>
        </p>
      ) : null}

      {suggestion.isPotentialReimbursement ? (
        <div className="mt-2 rounded-md border border-sky-200 bg-sky-50 px-2 py-2 text-sky-900">
          <p className="inline-flex items-start gap-1.5">
            <HandCoins className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Possível conta a receber / reembolso
              {suggestion.reimbursementReason ? ` — ${suggestion.reimbursementReason}` : ""}
            </span>
          </p>
          <p className="mt-2 text-[11px] text-sky-800">
            Sugestão apenas — nada é criado automaticamente.{" "}
            <a href="/dashboard/receivables" className="font-medium underline">
              Registrar em Contas a Receber
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
}
