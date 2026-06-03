"use client";

import { HandCoins, Loader2 } from "lucide-react";
import { useState } from "react";
import { isThirdPartyExpenseTransaction } from "@/lib/financial/receivable-transaction-metadata";
import type { TransactionListItem } from "@/types/transactions";

interface TransactionReceivableSectionProps {
  item: TransactionListItem;
}

export function TransactionReceivableSection({ item }: TransactionReceivableSectionProps) {
  const [devedorNome, setDevedorNome] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (item.type !== "EXPENSE") return null;

  const alreadyLinked = isThirdPartyExpenseTransaction(item.metadata);

  if (alreadyLinked) {
    return (
      <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <p className="inline-flex items-center gap-2 font-medium">
          <HandCoins className="h-4 w-4" />
          Compra para terceiro — conta a receber vinculada
        </p>
        <p className="mt-1 text-xs text-sky-800">
          Esta despesa não entra como gasto pessoal na DRE.{" "}
          <a href="/dashboard/receivables" className="underline">
            Ver contas a receber
          </a>
        </p>
      </section>
    );
  }

  async function handleCreate() {
    if (!devedorNome.trim()) {
      setError("Informe o nome do devedor.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/receivables/from-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: item.id,
          devedorNome: devedorNome.trim(),
          expectedDate: expectedDate || undefined,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Falha ao registrar conta a receber.");
      }

      setMessage("Conta a receber criada. O lançamento deixa de inflar despesas pessoais.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao registrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Compra para terceiro</h3>
        <p className="mt-1 text-xs text-slate-500">
          Registra um ativo (conta a receber) em vez de despesa pessoal definitiva.
        </p>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="text-slate-600">Devedor</span>
        <input
          value={devedorNome}
          onChange={(e) => setDevedorNome(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
          placeholder="Ex.: João, Empresa XYZ"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-slate-600">Previsão de recebimento</span>
        <input
          type="date"
          value={expectedDate}
          onChange={(e) => setExpectedDate(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleCreate()}
        className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900 hover:bg-sky-100 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />}
        Marcar como conta a receber
      </button>
    </section>
  );
}
