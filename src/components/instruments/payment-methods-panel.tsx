"use client";

import type { ConfigFormaPagamento } from "@/types/instruments-config";

interface PaymentMethodsPanelProps {
  items: ConfigFormaPagamento[];
  onCreated: () => Promise<void>;
  onNotify: (message: { type: "success" | "error"; text: string }) => void;
}

export function PaymentMethodsPanel({ items }: PaymentMethodsPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Formas de Pagamento</h2>
      <p className="mt-1 text-sm text-slate-500">{items.length} forma(s) cadastrada(s).</p>
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
