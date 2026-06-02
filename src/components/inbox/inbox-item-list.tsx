"use client";

import type { InboxItem } from "@/types/inbox";
import { REVIEWABLE_STATUSES } from "@/types/inbox.constants";
import { ArrowRight, Inbox } from "lucide-react";
import { InboxChannelBadge } from "./inbox-channel-badge";
import { InboxStatusBadge } from "./inbox-status-badge";
import { cn } from "@/lib/utils/cn";

interface InboxItemListProps {
  items: InboxItem[];
  onReview: (item: InboxItem) => void;
  className?: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function InboxItemList({ items, onReview, className }: InboxItemListProps) {
  if (items.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center",
          className,
        )}
      >
        <Inbox className="mb-3 h-10 w-10 text-slate-400" />
        <p className="text-sm font-medium text-slate-700">Caixa Financeira vazia</p>
        <p className="mt-1 text-sm text-slate-500">
          Envie uma mensagem ou use a entrada rápida acima.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => {
        const canReview = REVIEWABLE_STATUSES.includes(item.status);

        return (
          <article
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <InboxChannelBadge channel={item.channel} />
                  <InboxStatusBadge status={item.status} />
                  <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-800">{item.rawContent}</p>
                {item.errorMessage && (
                  <p className="text-xs text-red-600">{item.errorMessage}</p>
                )}
              </div>

              {canReview && (
                <button
                  type="button"
                  onClick={() => onReview(item)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Revisar e Efetivar
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
