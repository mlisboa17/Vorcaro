"use client";

import { formatSignedCurrency } from "@/lib/utils/format-currency";
import type { TransactionListItem } from "@/types/transactions";
import { Bot, Hand, Loader2, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface TransactionTableProps {
  items: TransactionListItem[];
  deletingId: string | null;
  onEdit: (item: TransactionListItem) => void;
  onDelete: (item: TransactionListItem) => void;
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(isoDate));
}

function formatInstrument(item: TransactionListItem): string {
  if (!item.card) {
    return "—";
  }

  const current = item.currentInstallment ?? 1;
  const total = item.totalInstallments ?? item.installments;

  if (total > 1) {
    return `${item.card.name} (${current}/${total})`;
  }

  return item.card.name;
}

function OriginBadge({ inboxItemId }: { inboxItemId: string | null }) {
  if (inboxItemId) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200">
        <Bot className="h-3 w-3" />
        IA
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
      <Hand className="h-3 w-3" />
      Manual
    </span>
  );
}

function AmountCell({ item }: { item: TransactionListItem }) {
  const isIncome = item.type === "INCOME";
  const isExpense = item.type === "EXPENSE";

  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        isIncome && "text-emerald-700",
        isExpense && "text-rose-700",
        !isIncome && !isExpense && "text-slate-700",
      )}
    >
      {formatSignedCurrency(item.amount, item.type)}
    </span>
  );
}

function ActionButtons({
  item,
  deletingId,
  onEdit,
  onDelete,
}: {
  item: TransactionListItem;
  deletingId: string | null;
  onEdit: (item: TransactionListItem) => void;
  onDelete: (item: TransactionListItem) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => onEdit(item)}
        disabled={deletingId === item.id}
        className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        title="Editar lançamento"
        aria-label={`Editar ${item.description}`}
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(item)}
        disabled={deletingId === item.id}
        className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
        title="Excluir lançamento"
        aria-label={`Excluir ${item.description}`}
      >
        {deletingId === item.id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

export function TransactionTable({ items, deletingId, onEdit, onDelete }: TransactionTableProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Data
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Descrição
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Categoria
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Conta
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Método
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Instrumento
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Origem
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Valor
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  {formatDate(item.date)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.description}</td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {item.category?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{item.account?.name ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {item.paymentMethod?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{formatInstrument(item)}</td>
                <td className="px-4 py-3">
                  <OriginBadge inboxItemId={item.inboxItemId} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                  <AmountCell item={item} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <ActionButtons
                    item={item}
                    deletingId={deletingId}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{item.description}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(item.date)}</p>
              </div>
              <AmountCell item={item} />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <dt className="text-slate-400">Categoria</dt>
                <dd className="font-medium">{item.category?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Conta</dt>
                <dd className="font-medium">{item.account?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Método</dt>
                <dd className="font-medium">{item.paymentMethod?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Instrumento</dt>
                <dd className="font-medium">{formatInstrument(item)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Origem</dt>
                <dd className="mt-0.5">
                  <OriginBadge inboxItemId={item.inboxItemId} />
                </dd>
              </div>
            </dl>

            <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => onEdit(item)}
                disabled={deletingId === item.id}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => onDelete(item)}
                disabled={deletingId === item.id}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
              >
                {deletingId === item.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Excluir
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
