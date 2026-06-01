"use client";

import type { ConfigCategoria } from "@/types/instruments-config";

interface CategoriesPanelProps {
  items: ConfigCategoria[];
  onCreated: () => Promise<void>;
  onNotify: (message: { type: "success" | "error"; text: string }) => void;
}

export function CategoriesPanel({ items }: CategoriesPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Categorias</h2>
      <p className="mt-1 text-sm text-slate-500">{items.length} categoria(s) principal(is).</p>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
            {item.nome}
            {item.subcategorias?.length ? (
              <span className="text-slate-500"> · {item.subcategorias.length} subcategoria(s)</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
