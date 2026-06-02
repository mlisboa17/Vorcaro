"use client";

import type { TransactionType } from "@prisma/client";
import type { FinanceCatalog } from "@/types/inbox";
import { Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { flattenCatalogCategories } from "@/lib/categories/category-utils";
import { cn } from "@/lib/utils/cn";
import { isCardPaymentMethodType } from "@/modules/financial-instruments/domain/utils/payment-method-type.mapper";
import {
  emptyPatrimonyImpactState,
  parsePatrimonyImpactState,
  TransactionPatrimonyImpactSection,
} from "./transaction-patrimony-impact";

interface CreateTransactionModalProps {
  open: boolean;
  catalog: FinanceCatalog;
  onClose: () => void;
  onSaved: () => void;
}

const TRANSACTION_TYPES: TransactionType[] = ["EXPENSE", "INCOME", "TRANSFER"];
const inputClassName =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function CreateTransactionModal({
  open,
  catalog,
  onClose,
  onSaved,
}: CreateTransactionModalProps) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<TransactionType>("EXPENSE");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [categoriaId, setCategoriaId] = useState("");
  const [contaFinanceiraId, setContaFinanceiraId] = useState("");
  const [formaPagamentoId, setFormaPagamentoId] = useState("");
  const [cartaoId, setCartaoId] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [patrimony, setPatrimony] = useState(emptyPatrimonyImpactState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = useMemo(() => flattenCatalogCategories(catalog.categories), [catalog.categories]);

  const selectedPaymentMethod = useMemo(
    () => catalog.paymentMethods.find((method) => method.id === formaPagamentoId),
    [catalog.paymentMethods, formaPagamentoId],
  );

  const showCardField = isCardPaymentMethodType(
    selectedPaymentMethod?.type as Parameters<typeof isCardPaymentMethodType>[0],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setDescricao("");
    setValor("");
    setTipo("EXPENSE");
    setData(new Date().toISOString().slice(0, 10));
    setCategoriaId("");
    setContaFinanceiraId(catalog.accounts[0]?.id ?? "");
    setFormaPagamentoId("");
    setCartaoId("");
    setParcelas("1");
    setPatrimony(emptyPatrimonyImpactState());
  }, [open, catalog.accounts]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      const parsedValor = Number(valor);
      const parsedParcelas = Number(parcelas);

      if (!descricao.trim()) throw new Error("Informe a descrição");
      if (!Number.isFinite(parsedValor) || parsedValor <= 0) throw new Error("Informe um valor válido");
      if (!data) throw new Error("Informe a data");
      if (!categoriaId || !contaFinanceiraId || !formaPagamentoId) {
        throw new Error("Preencha categoria, conta e forma de pagamento");
      }
      if (showCardField && !cartaoId) throw new Error("Selecione o cartão");
      if (!Number.isInteger(parsedParcelas) || parsedParcelas < 1) {
        throw new Error("Informe um número válido de parcelas");
      }

      const patrimonyPayload = parsePatrimonyImpactState(patrimony);

      const response = await fetch("/api/transactions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: descricao.trim(),
          valor: parsedValor,
          tipo,
          data,
          categoriaId,
          contaFinanceiraId,
          formaPagamentoId: formaPagamentoId,
          cartaoId: showCardField ? cartaoId : null,
          parcelas: parsedParcelas,
          liabilityId: patrimonyPayload.liabilityId,
          allocations: patrimonyPayload.allocations,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Não foi possível criar o lançamento");
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Fechar"
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">Novo lançamento</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="Descrição">
            <input className={inputClassName} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Field>
          <Field label="Tipo">
            <select
              className={inputClassName}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TransactionType)}
            >
              {TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Valor (R$)">
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputClassName}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </Field>
          <Field label="Data">
            <input
              type="date"
              className={inputClassName}
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </Field>
          <Field label="Conta financeira">
            <select
              className={inputClassName}
              value={contaFinanceiraId}
              onChange={(e) => setContaFinanceiraId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {catalog.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Categoria">
            <select
              className={inputClassName}
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Forma de pagamento">
            <select
              className={inputClassName}
              value={formaPagamentoId}
              onChange={(e) => setFormaPagamentoId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {catalog.paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </Field>
          {showCardField ? (
            <Field label="Cartão">
              <select
                className={inputClassName}
                value={cartaoId}
                onChange={(e) => setCartaoId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {catalog.cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label="Parcelas">
            <input
              type="number"
              min="1"
              className={inputClassName}
              value={parcelas}
              onChange={(e) => setParcelas(e.target.value)}
            />
          </Field>

          <TransactionPatrimonyImpactSection
            state={patrimony}
            onChange={setPatrimony}
            parcelaValor={Number(valor) || undefined}
          />

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        </div>

        <footer className="border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50",
            )}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Criar lançamento
          </button>
        </footer>
      </aside>
    </>
  );
}
