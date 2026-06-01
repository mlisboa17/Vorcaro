"use client";

import type { ConfigCartao, ConfigConta } from "@/types/instruments-config";

interface CardsPanelProps {
  items: ConfigCartao[];
  contas: ConfigConta[];
  onCreated: () => Promise<void>;
  onNotify: (message: { type: "success" | "error"; text: string }) => void;
}

export function CardsPanel({ items }: CardsPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Cartões</h2>
      <p className="mt-1 text-sm text-slate-500">{items.length} cartão(ões) cadastrado(s).</p>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
            {item.nome}
          </li>
        ))}
      </ul>
    </section>
  );
}
