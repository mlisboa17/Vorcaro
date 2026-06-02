"use client";

import { Loader2, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SettingsRowActionsProps {
  active: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  loading?: boolean;
}

export function SettingsRowActions({
  active,
  onEdit,
  onToggleActive,
  onDelete,
  loading = false,
}: SettingsRowActionsProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={loading}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        aria-label="Ações"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onToggleActive();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <Power className="h-4 w-4" />
            {active ? "Desativar" : "Reativar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </button>
        </div>
      ) : null}
    </div>
  );
}
