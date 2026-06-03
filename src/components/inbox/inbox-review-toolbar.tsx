"use client";

import type { FinanceCatalog } from "@/types/inbox";
import type { InboxReviewFilters } from "@/lib/inbox/inbox-review-filters";
import { isReviewFiltersActive } from "@/lib/inbox/inbox-review-filters";
import type { InboxChannel } from "@prisma/client";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface InboxReviewToolbarProps {
  filters: InboxReviewFilters;
  catalog: FinanceCatalog;
  visibleSelectableCount: number;
  pendingCount: number;
  selectFirstCount: string;
  onFiltersChange: (patch: Partial<InboxReviewFilters>) => void;
  onSelectFirstCountChange: (value: string) => void;
  onSelectFiltered: () => void;
  onSelectFirstN: () => void;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
}

const CHANNEL_OPTIONS: { value: InboxChannel | ""; label: string }[] = [
  { value: "", label: "Todas as origens" },
  { value: "WEB_IMPORT", label: "Importação" },
  { value: "TELEGRAM", label: "Telegram" },
  { value: "TELEGRAM_VOICE", label: "Telegram · Voz" },
  { value: "TELEGRAM_IMAGE", label: "Telegram · Foto" },
  { value: "WEB", label: "Web" },
  { value: "WEB_VOICE", label: "Web · Voz" },
  { value: "WEB_IMAGE", label: "Web · Foto" },
];

export function InboxReviewToolbar({
  filters,
  catalog,
  visibleSelectableCount,
  pendingCount,
  selectFirstCount,
  onFiltersChange,
  onSelectFirstCountChange,
  onSelectFiltered,
  onSelectFirstN,
  onSelectAllVisible,
  onClearSelection,
}: InboxReviewToolbarProps) {
  const filtersActive = isReviewFiltersActive(filters);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-800">
          <span className="tabular-nums">{pendingCount}</span>{" "}
          {pendingCount === 1 ? "item pendente" : "itens pendentes"}
        </p>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="block min-w-0 flex-1 space-y-1">
          <span className="text-xs font-medium text-slate-600">Buscar na revisão</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={filters.search}
              onChange={(event) => onFiltersChange({ search: event.target.value })}
              placeholder="Ex.: OUTBACK, IFOOD, Fortlev…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </span>
        </label>

        <label className="block space-y-1 sm:min-w-[10rem]">
          <span className="text-xs font-medium text-slate-600">Origem</span>
          <select
            value={filters.channel}
            onChange={(event) =>
              onFiltersChange({ channel: event.target.value as InboxChannel | "" })
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {CHANNEL_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 sm:min-w-[10rem]">
          <span className="text-xs font-medium text-slate-600">Cartão</span>
          <select
            value={filters.cardId}
            onChange={(event) => onFiltersChange({ cardId: event.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos os cartões</option>
            {catalog.cards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 sm:min-w-[10rem]">
          <span className="text-xs font-medium text-slate-600">Categoria (texto)</span>
          <select
            value={filters.categoryId}
            onChange={(event) => onFiltersChange({ categoryId: event.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            title="Filtra itens cuja descrição contém o nome da categoria"
          >
            <option value="">Todas</option>
            {catalog.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
        <FilterChip
          active={filters.highConfidenceOnly}
          onClick={() => onFiltersChange({ highConfidenceOnly: !filters.highConfidenceOnly })}
          label="Alta confiança"
        />
        <FilterChip
          active={filters.noCategoryOnly}
          onClick={() => onFiltersChange({ noCategoryOnly: !filters.noCategoryOnly })}
          label="Sem categoria"
        />
        <FilterChip
          active={filters.lowConfidenceOnly}
          onClick={() => onFiltersChange({ lowConfidenceOnly: !filters.lowConfidenceOnly })}
          label="Baixa confiança"
        />
        <FilterChip
          active={filters.possibleDuplicateOnly}
          onClick={() =>
            onFiltersChange({ possibleDuplicateOnly: !filters.possibleDuplicateOnly })
          }
          label="Possíveis duplicados"
        />
        <FilterChip
          active={filters.potentialReimbursementOnly}
          onClick={() =>
            onFiltersChange({ potentialReimbursementOnly: !filters.potentialReimbursementOnly })
          }
          label="Possíveis reembolsos"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ToolbarButton onClick={onSelectAllVisible} disabled={visibleSelectableCount === 0}>
          Selecionar visíveis ({visibleSelectableCount})
        </ToolbarButton>
        <ToolbarButton onClick={onSelectFiltered} disabled={!filtersActive || visibleSelectableCount === 0}>
          Selecionar filtrados
        </ToolbarButton>
        <div className="flex items-center gap-1.5">
          <label htmlFor="inbox-select-first-n" className="text-xs text-slate-600">
            Primeiros
          </label>
          <input
            id="inbox-select-first-n"
            type="number"
            min={1}
            max={Math.max(1, visibleSelectableCount)}
            value={selectFirstCount}
            onChange={(event) => onSelectFirstCountChange(event.target.value)}
            className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          />
          <ToolbarButton onClick={onSelectFirstN} disabled={visibleSelectableCount === 0}>
            Selecionar
          </ToolbarButton>
        </div>
        <ToolbarButton onClick={onClearSelection}>Limpar seleção</ToolbarButton>
      </div>

      <p className="text-xs text-slate-500">
        Dica: clique em um item e use <kbd className="rounded border bg-white px-1">Shift</kbd>+clique
        em outro para selecionar o intervalo. O clique no card não seleciona — use o checkbox ou o
        botão Revisar.
      </p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-violet-400 bg-violet-50 text-violet-800"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      )}
    >
      {label}
    </button>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
