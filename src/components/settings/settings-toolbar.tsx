"use client";

import { Search } from "lucide-react";

interface SettingsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  showInactive: boolean;
  onShowInactiveChange: (value: boolean) => void;
  actions?: React.ReactNode;
}

export function SettingsToolbar({
  search,
  onSearchChange,
  showInactive,
  onShowInactiveChange,
  actions,
}: SettingsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por nome..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(event) => onShowInactiveChange(event.target.checked)}
            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          Mostrar inativos
        </label>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
