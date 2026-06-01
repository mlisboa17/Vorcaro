"use client";

import { formatCurrency } from "@/lib/utils/format-currency";
import type { TransactionSummary } from "@/types/transactions";
import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet } from "lucide-react";

interface TransactionBalanceCardsProps {
  summary: TransactionSummary;
}

export function TransactionBalanceCards({ summary }: TransactionBalanceCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-slate-500">
          <Landmark className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">
            {summary.mainAccountName ?? "Conta principal"}
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
          {formatCurrency(summary.mainAccountBalance)}
        </p>
        <p className="mt-1 text-xs text-slate-500">Saldo consolidado</p>
      </article>

      <article className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-emerald-700">
          <ArrowUpRight className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Entradas</span>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-emerald-700">
          {formatCurrency(summary.periodIncome)}
        </p>
        <p className="mt-1 text-xs text-emerald-600/80">{summary.periodLabel}</p>
      </article>

      <article className="rounded-xl border border-rose-200 bg-rose-50/60 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-rose-700">
          <ArrowDownLeft className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Saídas</span>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-rose-700">
          {formatCurrency(summary.periodExpense)}
        </p>
        <p className="mt-1 text-xs text-rose-600/80">{summary.periodLabel}</p>
      </article>
    </div>
  );
}

export function TransactionBalanceCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white"
        />
      ))}
    </div>
  );
}

export function TransactionEmptyBalanceHint() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
      <Wallet className="h-4 w-4 shrink-0" />
      Nenhuma transação encontrada para os filtros selecionados.
    </div>
  );
}
