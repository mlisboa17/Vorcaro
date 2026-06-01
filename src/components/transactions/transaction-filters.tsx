"use client";

import type { FinanceCatalog, PeriodPreset } from "@/types/transactions";
import { cn } from "@/lib/utils/cn";
import { Filter } from "lucide-react";

interface TransactionFiltersProps {
  catalog: FinanceCatalog;
  accountId: string;
  categoryId: string;
  period: PeriodPreset;
  onAccountChange: (accountId: string) => void;
  onCategoryChange: (categoryId: string) => void;
  onPeriodChange: (period: PeriodPreset) => void;
}

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "current_month", label: "Mês atual" },
  { value: "previous_month", label: "Mês anterior" },
];

export function TransactionFilters({
  catalog,
  accountId,
  categoryId,
  period,
  onAccountChange,
  onCategoryChange,
  onPeriodChange,
}: TransactionFiltersProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
        <Filter className="h-4 w-4" />
        Filtros
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Conta</span>
          <select
            value={accountId}
            onChange={(event) => onAccountChange(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
          >
            <option value="">Todas as contas</option>
            {catalog.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Categoria
          </span>
          <select
            value={categoryId}
            onChange={(event) => onCategoryChange(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
          >
            <option value="">Todas as categorias</option>
            {catalog.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Período</span>
          <div className="flex gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onPeriodChange(option.value)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition",
                  period === option.value
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
