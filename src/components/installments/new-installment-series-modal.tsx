"use client";

import { X, Loader2 } from "lucide-react";
import { useState } from "react";
import type { FinanceCatalog } from "@/types/inbox";

interface Props {
  catalog: FinanceCatalog;
  onClose: () => void;
  onCreated: () => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NewInstallmentSeriesModal({ catalog, onClose, onCreated }: Props) {
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("2");
  const [baseDate, setBaseDate] = useState(today());
  const [cardId, setCardId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCards = catalog.cards.filter((c) => c.isActive !== false);
  const activeAccounts = catalog.accounts.filter((a) => a.isActive !== false);
  const expenseCategories = catalog.categories.filter(
    (c) => c.isActive !== false && (c.type === "EXPENSE" || c.type === "BOTH"),
  );

  const installmentCount = Math.max(2, Math.min(60, parseInt(totalInstallments) || 2));
  const amountNum = parseFloat(totalAmount.replace(",", ".")) || 0;
  const perInstallment = installmentCount > 0 && amountNum > 0 ? amountNum / installmentCount : 0;

  const selectedCard = activeCards.find((c) => c.id === cardId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!description.trim()) return setError("Informe a descrição.");
    if (amountNum <= 0) return setError("Informe um valor válido.");
    if (installmentCount < 2) return setError("Mínimo de 2 parcelas.");

    setSaving(true);
    try {
      const res = await fetch("/api/installments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          totalAmount: amountNum,
          totalInstallments: installmentCount,
          baseDate,
          cardId: cardId || null,
          accountId: accountId || null,
          categoryId: categoryId || null,
          paymentMethodId: paymentMethodId || null,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Erro ao criar parcelamento.");
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Nova compra parcelada</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Notebook Dell, Geladeira, Viagem..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Valor total (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Número de parcelas</label>
              <input
                type="number"
                min={2}
                max={60}
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {perInstallment > 0 && (
            <p className="text-sm text-slate-500">
              ≈{" "}
              <span className="font-semibold text-slate-800">
                {perInstallment.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>{" "}
              por parcela
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Data da compra</label>
            <input
              type="date"
              value={baseDate}
              onChange={(e) => setBaseDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cartão de crédito</label>
            <select
              value={cardId}
              onChange={(e) => { setCardId(e.target.value); if (e.target.value) setAccountId(""); }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">— Sem cartão —</option>
              {activeCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.lastFourDigits ? ` •••• ${c.lastFourDigits}` : ""}
                </option>
              ))}
            </select>
            {selectedCard && (
              <p className="mt-1 text-xs text-slate-500">
                As parcelas serão lançadas no dia de vencimento da fatura do cartão.
              </p>
            )}
          </div>

          {!cardId && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Conta</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">— Selecione a conta —</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">— Sem categoria —</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar parcelamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
