"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, X, XCircle } from "lucide-react";
import { useState } from "react";
import type { InboxBulkConfirmSummary } from "@/lib/inbox/inbox-queue-filter";
import { cn } from "@/lib/utils/cn";

interface InboxBulkResultToastProps {
  summary: InboxBulkConfirmSummary;
  onDismiss: () => void;
}

export function InboxBulkResultToast({ summary, onDismiss }: InboxBulkResultToastProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasIssues = summary.needsReview > 0 || summary.failed > 0;
  const hasDetails = summary.failedItems.length > 0;

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-md rounded-xl border shadow-xl",
        hasIssues ? "border-amber-200 bg-white" : "border-emerald-200 bg-emerald-50",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="space-y-2 text-sm">
          {summary.confirmed > 0 ? (
            <p className="flex items-center gap-2 font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {summary.confirmed}{" "}
              {summary.confirmed === 1 ? "lançamento efetivado" : "lançamentos efetivados"}
            </p>
          ) : null}
          {summary.needsReview > 0 ? (
            <p className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {summary.needsReview}{" "}
              {summary.needsReview === 1 ? "precisa de revisão" : "precisam de revisão"}
            </p>
          ) : null}
          {summary.failed > 0 ? (
            <p className="flex items-center gap-2 text-red-800">
              <XCircle className="h-4 w-4 shrink-0" />
              {summary.failed} {summary.failed === 1 ? "falhou" : "falharam"}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
          aria-label="Fechar resumo"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {hasDetails ? (
        <div className="border-t border-slate-100 px-4 py-2">
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="flex w-full items-center justify-between py-1 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Ver detalhes
            {detailsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {detailsOpen ? (
            <ul className="mt-2 max-h-32 space-y-1 overflow-auto text-xs text-slate-600">
              {summary.failedItems.map((item) => (
                <li key={item.id} className="rounded bg-slate-50 px-2 py-1">
                  <span className="font-mono text-[10px] text-slate-400">{item.id.slice(0, 8)}…</span>
                  <span className="ml-1">{item.reason}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
