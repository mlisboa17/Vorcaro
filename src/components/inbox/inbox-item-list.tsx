"use client";

import type { InboxItem } from "@/types/inbox";
import { REVIEWABLE_STATUSES } from "@/types/inbox.constants";
import { groupInboxItems } from "@/lib/inbox/inbox-review-filters";
import { ArrowRight, Inbox } from "lucide-react";
import { InboxChannelBadge } from "./inbox-channel-badge";
import { InboxStatusBadge } from "./inbox-status-badge";
import { InboxSelectionCheckbox } from "./inbox-selection-checkbox";
import { InboxClassificationHint } from "./inbox-classification-hint";
import type { InboxClassificationSuggestion } from "@/modules/inbox-intelligence/domain/types/inbox-classification";
import { cn } from "@/lib/utils/cn";

interface InboxItemListProps {
  items: InboxItem[];
  selectedIds: Set<string>;
  selectionAnchorId: string | null;
  efetivandoIds?: Set<string>;
  exitingIds?: Set<string>;
  groupByDescription?: boolean;
  onSelectionAnchorChange: (id: string | null) => void;
  onToggleSelect: (id: string, shiftKey: boolean) => void;
  onSelectGroup: (ids: string[]) => void;
  onReview: (item: InboxItem) => void;
  classifications?: Record<string, InboxClassificationSuggestion>;
  className?: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function InboxItemList({
  items,
  selectedIds,
  selectionAnchorId,
  efetivandoIds,
  exitingIds,
  groupByDescription = true,
  onSelectionAnchorChange,
  onToggleSelect,
  onSelectGroup,
  onReview,
  classifications,
  className,
}: InboxItemListProps) {
  if (items.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center",
          className,
        )}
      >
        <Inbox className="mb-3 h-10 w-10 text-slate-400" />
        <p className="text-sm font-medium text-slate-700">Nenhum lançamento nesta visão</p>
        <p className="mt-1 text-sm text-slate-500">
          Ajuste os filtros ou importe um extrato/fatura.
        </p>
      </div>
    );
  }

  const groups = groupByDescription ? groupInboxItems(items) : [{ key: "Todos", items: [...items] }];

  return (
    <div className={cn("space-y-6", className)}>
      {groups.map((group) => {
        const groupSelectableIds = group.items
          .filter((item) => REVIEWABLE_STATUSES.includes(item.status))
          .map((item) => item.id);
        const groupAllSelected =
          groupSelectableIds.length > 0 &&
          groupSelectableIds.every((id) => selectedIds.has(id));
        return (
          <section key={group.key} className="space-y-3">
            {groupByDescription && group.items.length > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {group.key}
                  <span className="ml-2 font-normal normal-case text-slate-500">
                    ({group.items.length})
                  </span>
                </h3>
                {groupSelectableIds.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => onSelectGroup(groupSelectableIds)}
                    className="text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
                  >
                    {groupAllSelected ? "Desmarcar grupo" : "Selecionar grupo"}
                  </button>
                ) : null}
              </div>
            ) : null}

            {group.items.map((item) => {
              const canReview = REVIEWABLE_STATUSES.includes(item.status);
              const isSelected = selectedIds.has(item.id);
              const isEfetivando = efetivandoIds?.has(item.id) ?? false;
              const isExiting = exitingIds?.has(item.id) ?? false;
              const displayStatus =
                isEfetivando || isExiting ? ("SAVED" as const) : item.status;

              return (
                <article
                  key={item.id}
                  className={cn(
                    "rounded-xl border bg-white p-4 shadow-sm transition-all duration-[420ms] ease-out",
                    isExiting && "pointer-events-none scale-[0.98] opacity-0 -translate-y-1",
                    isEfetivando && !isExiting && "border-emerald-300 bg-emerald-50/40 ring-2 ring-emerald-400/50",
                    isSelected && !isEfetivando && !isExiting
                      ? "border-slate-900 ring-2 ring-slate-900/20"
                      : !isEfetivando && !isExiting && "border-slate-200 hover:border-slate-300 hover:shadow-md",
                  )}
                  aria-hidden={isExiting}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 flex-1 gap-3">
                      {canReview && !isEfetivando && !isExiting ? (
                        <div className="pt-0.5">
                          <InboxSelectionCheckbox
                            checked={isSelected}
                            ariaLabel={`Selecionar lançamento: ${item.rawContent.slice(0, 60)}`}
                            onChange={() => undefined}
                            onClick={(event) => {
                              event.stopPropagation();
                              event.preventDefault();
                              onToggleSelect(item.id, event.shiftKey);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-4 shrink-0" aria-hidden />
                      )}

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <InboxChannelBadge channel={item.channel} />
                          <InboxStatusBadge status={displayStatus} />
                          <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-800">{item.rawContent}</p>
                        {item.errorMessage ? (
                          <p className="text-xs text-red-600">{item.errorMessage}</p>
                        ) : null}
                        <InboxClassificationHint suggestion={classifications?.[item.id]} />
                      </div>
                    </div>

                    {canReview && !isEfetivando && !isExiting ? (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectionAnchorChange(item.id);
                          onReview(item);
                        }}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                      >
                        Revisar e Efetivar
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
