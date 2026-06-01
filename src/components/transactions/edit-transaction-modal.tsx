"use client";

import type { TransactionType } from "@prisma/client";
import type { FinanceCatalog } from "@/types/inbox";
import type { TransactionListItem } from "@/types/transactions";
import { Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { flattenCatalogCategories } from "@/lib/categories/category-utils";
import { cn } from "@/lib/utils/cn";
import { isCardPaymentMethodType } from "@/modules/financial-instruments/domain/utils/payment-method-type.mapper";

interface EditTransactionModalProps {
  item: TransactionListItem | null;
  catalog: FinanceCatalog;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface EditFormState {
  descricao: string;
  valor: string;
  tipo: TransactionType;
  data: string;
  categoriaId: string;
  contaFinanceiraId: string;
  metodoPagamentoId: string;
  cartaoId: string;
  parcelas: string;
}

const TRANSACTION_TYPES: TransactionType[] = ["EXPENSE", "INCOME", "TRANSFER"];
const inputClassName =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

function toDateInputValue(value: string): string {
  return value.slice(0, 10);
}

function findCashWalletAccount(catalog: FinanceCatalog) {
  return (
    catalog.accounts.find((account) => account.type === "CARTEIRA_DINHEIRO") ??
    catalog.accounts.find((account) => account.name.toLowerCase().includes("carteira dinheiro")) ??
    catalog.accounts[0]
  );
}

function buildInitialForm(item: TransactionListItem, catalog: FinanceCatalog): EditFormState {
  return {
    descricao: item.description,
    valor: item.amount.toString(),
    tipo: item.type,
    data: toDateInputValue(item.date),
    categoriaId: item.categoryId ?? "",
    contaFinanceiraId: item.accountId ?? findCashWalletAccount(catalog)?.id ?? "",
    metodoPagamentoId: item.paymentMethodId ?? "",
    cartaoId: item.cardId ?? "",
    parcelas: item.installments.toString(),
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function EditTransactionModal({
  item,
  catalog,
  open,
  onClose,
  onSaved,
}: EditTransactionModalProps) {
  const [form, setForm] = useState<EditFormState>(() =>
    item ? buildInitialForm(item, catalog) : {
      descricao: "",
      valor: "",
      tipo: "EXPENSE",
      data: "",
      categoriaId: "",
      contaFinanceiraId: "",
      metodoPagamentoId: "",
      cartaoId: "",
      parcelas: "1",
    },
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = useMemo(() => flattenCatalogCategories(catalog.categories), [catalog.categories]);

  const selectedPaymentMethod = useMemo(
    () => catalog.paymentMethods.find((method) => method.id === form.metodoPagamentoId),
    [catalog.paymentMethods, form.metodoPagamentoId],
  );

  const showCardField = isCardPaymentMethodType(
    selectedPaymentMethod?.type as Parameters<typeof isCardPaymentMethodType>[0],
  );

  useEffect(() => {
    if (!open || !item) {
      return;
    }

    setError(null);
    setForm(buildInitialForm(item, catalog));
  }, [open, item, catalog]);

  async function handleSubmit() {
    if (!item) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const parsedValor = Number(form.valor);
      const parsedParcelas = Number(form.parcelas);

      if (!form.descricao.trim()) {
        throw new Error("Informe a descrição");
      }

      if (!Number.isFinite(parsedValor) || parsedValor <= 0) {
        throw new Error("Informe um valor válido");
      }

      if (!form.data) {
        throw new Error("Informe a data");
      }

      if (!form.categoriaId || !form.contaFinanceiraId || !form.metodoPagamentoId) {
        throw new Error("Preencha categoria, conta e método de pagamento");
      }

      if (showCardField && !form.cartaoId) {
        throw new Error("Selecione o cartão");
      }

      if (!Number.isInteger(parsedParcelas) || parsedParcelas < 1) {
        throw new Error("Informe um número válido de parcelas");
      }

      const response = await fetch(`/api/transactions/${item.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: form.descricao.trim(),
          valor: parsedValor,
          tipo: form.tipo,
          data: form.data,
          categoriaId: form.categoriaId,
          contaFinanceiraId: form.contaFinanceiraId,
          metodoPagamentoId: form.metodoPagamentoId,
          cartaoId: showCardField ? form.cartaoId : null,
          parcelas: parsedParcelas,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Não foi possível salvar a transação");
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !item) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Fechar edição"
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Editar Lançamento</h2>
            <p className="mt-1 text-sm text-slate-500">{item.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <Field label="Descrição">
              <input
                type="text"
                value={form.descricao}
                onChange={(event) =>
                  setForm((current) => ({ ...current, descricao: event.target.value }))
                }
                className={inputClassName}
              />
            </Field>

            <Field label="Tipo">
              <select
                value={form.tipo}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tipo: event.target.value as TransactionType,
                  }))
                }
                className={inputClassName}
              >
                {TRANSACTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Valor (R$)">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.valor}
                onChange={(event) =>
                  setForm((current) => ({ ...current, valor: event.target.value }))
                }
                className={inputClassName}
              />
            </Field>

            <Field label="Data">
              <input
                type="date"
                value={form.data}
                onChange={(event) =>
                  setForm((current) => ({ ...current, data: event.target.value }))
                }
                className={inputClassName}
              />
            </Field>

            <Field label="Conta Financeira">
              <select
                value={form.contaFinanceiraId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, contaFinanceiraId: event.target.value }))
                }
                className={inputClassName}
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
                value={form.categoriaId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, categoriaId: event.target.value }))
                }
                className={inputClassName}
              >
                <option value="">Selecione...</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Método de Pagamento">
              <select
                value={form.metodoPagamentoId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, metodoPagamentoId: event.target.value }))
                }
                className={inputClassName}
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
                  value={form.cartaoId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, cartaoId: event.target.value }))
                  }
                  className={inputClassName}
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
                step="1"
                value={form.parcelas}
                onChange={(event) =>
                  setForm((current) => ({ ...current, parcelas: event.target.value }))
                }
                className={inputClassName}
              />
            </Field>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}
          </div>
        </div>

        <footer className="border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar Alterações
          </button>
        </footer>
      </aside>
    </>
  );
}
