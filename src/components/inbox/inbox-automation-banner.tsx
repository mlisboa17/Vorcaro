"use client";

import { cn } from "@/lib/utils/cn";
import { CheckCircle2, HelpCircle, Sparkles } from "lucide-react";

interface InboxAutomationBannerProps {
  autoMessage?: string;
  batchMessage?: string;
  individualMessage?: string;
  autoCount: number;
  batchCount: number;
  uncertainCount: number;
  className?: string;
}

export function InboxAutomationBanner({
  autoMessage,
  batchMessage,
  individualMessage,
  autoCount,
  batchCount,
  uncertainCount,
  className,
}: InboxAutomationBannerProps) {
  if (!autoMessage && !batchMessage && !individualMessage) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {autoMessage ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Automação concluída</p>
            <p className="mt-0.5 text-emerald-800">{autoMessage}</p>
            {autoCount > 0 ? (
              <p className="mt-1 text-xs text-emerald-700/80">
                Você pode revisar posteriormente na fila de efetivados, se desejar.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {batchMessage && batchCount > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Confirmação em lote disponível</p>
            <p className="mt-0.5">{batchMessage}</p>
          </div>
        </div>
      ) : null}

      {individualMessage && uncertainCount > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{individualMessage}</p>
        </div>
      ) : null}
    </div>
  );
}
