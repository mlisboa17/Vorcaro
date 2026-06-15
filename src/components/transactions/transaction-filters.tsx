"use client";

import type { FinanceCatalog, PeriodPreset } from "@/types/transactions";
import { cn } from "@/lib/utils/cn";
import { Filter } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";

interface TransactionFiltersProps {
  catalog: FinanceCatalog;
  accountId: string;
  categoryId: string;
  period: PeriodPreset;
  startDate?: string;
  endDate?: string;
  onAccountChange: (accountId: string) => void;
  onCategoryChange: (categoryId: string) => void;
  onDateRangeChange: (next: { period: PeriodPreset; startDate?: string; endDate?: string }) => void;
}

export function TransactionFilters({
  catalog,
  accountId,
  categoryId,
  period,
  startDate,
  endDate,
  onAccountChange,
  onCategoryChange,
  onDateRangeChange,
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
          <div className="w-full">
            <DateRangePicker
              period={period}
              startDate={startDate}
              endDate={endDate}
              onChange={onDateRangeChange}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
