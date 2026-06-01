"use client";

import type { ConfigConta } from "@/types/instruments-config";

interface AccountsPanelProps {
  items: ConfigConta[];
  onCreated: () => Promise<void>;
  onNotify: (message: { type: "success" | "error"; text: string }) => void;
}

export function AccountsPanel({ items }: AccountsPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Contas Financeiras</h2>
      <p className="mt-1 text-sm text-slate-500">{items.length} conta(s) cadastrada(s).</p>
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
