"use client";

import type { FinanceCatalog } from "@/types/inbox";
import type { PatrimonyLiabilityDto } from "@/types/patrimony";
import type { TransactionListItem } from "@/types/transactions";
import { Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { flattenCatalogCategories } from "@/lib/categories/category-utils";
import { cn } from "@/lib/utils/cn";
import { isCardPaymentMethodType } from "@/modules/financial-instruments/domain/utils/payment-method-type.mapper";
import type { BulkTransactionUpdates } from "@/modules/transactions/domain/schemas/bulk-update-transactions-api.schema";

interface BulkEditTransactionsModalProps {
  open: boolean;
  selectedIds: string[];
  sampleItem: TransactionListItem | null;
  catalog: FinanceCatalog;
  onClose: () => void;
  onSaved: (updatedCount: number) => void;
}

interface BulkFormState {
  date: string;
  dataCaixa: string;
  dataCompra: string;
  categoriaId: string;
  contaFinanceiraId: string;
  formaPagamentoId: string;
  cartaoId: string;
  liabilityId: string;
  clearLiability: boolean;
  clearCard: boolean;
}

const emptyForm = (): BulkFormState => ({
  date: "",
  dataCaixa: "",
  dataCompra: "",
  categoriaId: "",
  contaFinanceiraId: "",
  formaPagamentoId: "",
  cartaoId: "",
  liabilityId: "",
  clearLiability: false,
  clearCard: false,
});

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

function formatDateLabel(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function PreviewRow({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <div className="text-sm">
      <p className="font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-slate-600">
        {from} <span className="text-slate-400">→</span> <span className="font-medium text-slate-900">{to}</span>
      </p>
    </div>
  );
}

function buildUpdates(form: BulkFormState, isCardPayment: boolean): BulkTransactionUpdates | null {
  const updates: BulkTransactionUpdates = {};

  if (form.date) {
    updates.date = form.date;
  }

  if (form.dataCaixa) {
    updates.dataCaixa = form.dataCaixa;
  }

  if (form.dataCompra) {
    updates.dataCompra = form.dataCompra;
  }

  if (form.categoriaId) {
    updates.categoryId = form.categoriaId;
  }

  if (form.contaFinanceiraId) {
    updates.financialAccountId = form.contaFinanceiraId;
  }

  if (form.formaPagamentoId) {
    updates.paymentMethodId = form.formaPagamentoId;

    if (isCardPayment) {
      if (!form.cartaoId) {
        return null;
      }

      updates.cardId = form.cartaoId;
    }
  } else if (form.clearCard) {
    updates.cardId = null;
  } else if (form.cartaoId) {
    updates.cardId = form.cartaoId;
  }

  if (form.clearLiability) {
    updates.liabilityId = null;
  } else if (form.liabilityId) {
    updates.liabilityId = form.liabilityId;
  }

  if (Object.keys(updates).length === 0) {
    return null;
  }

  return updates;
}

export function BulkEditTransactionsModal({
  open,
  selectedIds,
  sampleItem,
  catalog,
  onClose,
  onSaved,
}: BulkEditTransactionsModalProps) {
  const [form, setForm] = useState<BulkFormState>(emptyForm);
  const [liabilities, setLiabilities] = useState<PatrimonyLiabilityDto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "preview">("form");

  const categoryOptions = useMemo(() => flattenCatalogCategories(catalog.categories), [catalog.categories]);

  const selectedPaymentMethod = catalog.paymentMethods.find(
    (method) => method.id === form.formaPagamentoId,
  );
  const isCardPayment = selectedPaymentMethod
    ? isCardPaymentMethodType(selectedPaymentMethod.type as never)
    : false;

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(emptyForm());
    setError(null);
    setStep("form");

    void fetch("/api/patrimony/liabilities", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((payload: { items?: PatrimonyLiabilityDto[] }) => {
        setLiabilities(payload.items ?? []);
      })
      .catch(() => setLiabilities([]));
  }, [open]);

  const updates = useMemo(() => buildUpdates(form, isCardPayment), [form, isCardPayment]);

  const previewRows = useMemo(() => {
    if (!sampleItem || !updates) {
      return [];
    }

    const rows: Array<{ label: string; from: string; to: string }> = [];

    if (updates.date) {
      rows.push({
        label: "Data do Lançamento",
        from: formatDateLabel(sampleItem.date),
        to: formatDateLabel(`${updates.date}T12:00:00.000Z`),
      });
    }

    if (updates.dataCaixa) {
      rows.push({
        label: "Data de Caixa",
        from: formatDateLabel(sampleItem.dataCaixa),
        to: formatDateLabel(`${updates.dataCaixa}T12:00:00.000Z`),
      });
    }

    if (updates.dataCompra) {
      rows.push({
        label: "Data de Compra",
        from: formatDateLabel(sampleItem.dataCompra),
        to: formatDateLabel(`${updates.dataCompra}T12:00:00.000Z`),
      });
    }

    if (updates.categoryId) {
      const next = categoryOptions.find((option) => option.id === updates.categoryId);
      rows.push({
        label: "Categoria",
        from: sampleItem.category?.name ?? "—",
        to: next?.label ?? updates.categoryId,
      });
    }

    if (updates.financialAccountId) {
      const next = catalog.accounts.find((account) => account.id === updates.financialAccountId);
      rows.push({
        label: "Conta Financeira",
        from: sampleItem.account?.name ?? "—",
        to: next?.name ?? updates.financialAccountId,
      });
    }

    if (updates.paymentMethodId) {
      const next = catalog.paymentMethods.find((method) => method.id === updates.paymentMethodId);
      rows.push({
        label: "Forma de Pagamento",
        from: sampleItem.paymentMethod?.name ?? "—",
        to: next?.name ?? updates.paymentMethodId,
      });
    }

    if (updates.cardId !== undefined) {
      const next =
        updates.cardId === null
          ? "Sem cartão"
          : (catalog.cards.find((card) => card.id === updates.cardId)?.name ?? updates.cardId);
      rows.push({
        label: "Cartão",
        from: sampleItem.card?.name ?? "—",
        to: next,
      });
    }

    if (updates.liabilityId !== undefined) {
      const next =
        updates.liabilityId === null
          ? "Sem vínculo"
          : (liabilities.find((liability) => liability.id === updates.liabilityId)?.nome ??
            updates.liabilityId);
      rows.push({
        label: "Passivo",
        from: sampleItem.liabilityId ? "Vinculado" : "Sem vínculo",
        to: next,
      });
    }

    return rows;
  }, [sampleItem, updates, categoryOptions, catalog, liabilities]);

  async function handleSubmit() {
    if (!updates) {
      setError("Informe ao menos um campo para alterar.");
      return;
    }

    if (form.formaPagamentoId && isCardPayment && !form.cartaoId) {
      setError("Selecione o cartão para a forma de pagamento Cartão.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/transactions/bulk-update", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionIds: selectedIds,
          updates,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Falha ao atualizar lançamentos");
      }

      const result = (await response.json()) as { updatedCount: number };
      onSaved(result.updatedCount);
      onClose();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Erro inesperado";
      setError(message);
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-edit-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 id="bulk-edit-title" className="text-lg font-semibold text-slate-900">
              Editar Lançamentos em Lote
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Preencha apenas os campos que deseja alterar para todos os selecionados.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === "form" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data do Lançamento (opcional)">
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  className={inputClassName}
                />
              </Field>
              <Field label="Data de Caixa (opcional)">
                <input
                  type="date"
                  value={form.dataCaixa}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, dataCaixa: event.target.value }))
                  }
                  className={inputClassName}
                />
              </Field>
              <Field label="Data de Compra (opcional)">
                <input
                  type="date"
                  value={form.dataCompra}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, dataCompra: event.target.value }))
                  }
                  className={inputClassName}
                />
              </Field>
              <Field label="Categoria (opcional)">
                <select
                  value={form.categoriaId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, categoriaId: event.target.value }))
                  }
                  className={inputClassName}
                >
                  <option value="">Manter atual</option>
                  {categoryOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Conta Financeira (opcional)">
                <select
                  value={form.contaFinanceiraId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, contaFinanceiraId: event.target.value }))
                  }
                  className={inputClassName}
                >
                  <option value="">Manter atual</option>
                  {catalog.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Forma de Pagamento (opcional)">
                <select
                  value={form.formaPagamentoId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      formaPagamentoId: event.target.value,
                      cartaoId: "",
                    }))
                  }
                  className={inputClassName}
                >
                  <option value="">Manter atual</option>
                  {catalog.paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </Field>
              {(isCardPayment || form.cartaoId || form.clearCard) && (
                <Field label="Cartão (opcional)">
                  <select
                    value={form.clearCard ? "" : form.cartaoId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        cartaoId: event.target.value,
                        clearCard: false,
                      }))
                    }
                    className={inputClassName}
                    disabled={form.clearCard}
                  >
                    <option value="">Selecione…</option>
                    {catalog.cards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}
                      </option>
                    ))}
                  </select>
                  <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.clearCard}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          clearCard: event.target.checked,
                          cartaoId: "",
                        }))
                      }
                    />
                    Remover cartão vinculado
                  </label>
                </Field>
              )}
              <Field label="Passivo (opcional)">
                <select
                  value={form.clearLiability ? "" : form.liabilityId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      liabilityId: event.target.value,
                      clearLiability: false,
                    }))
                  }
                  className={inputClassName}
                  disabled={form.clearLiability}
                >
                  <option value="">Manter atual</option>
                  {liabilities.map((liability) => (
                    <option key={liability.id} value={liability.id}>
                      {liability.nome}
                    </option>
                  ))}
                </select>
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.clearLiability}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        clearLiability: event.target.checked,
                        liabilityId: "",
                      }))
                    }
                  />
                  Sem vínculo com passivo
                </label>
              </Field>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">{selectedIds.length}</span>{" "}
                {selectedIds.length === 1 ? "lançamento será alterado" : "lançamentos serão alterados"}
              </p>
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                {previewRows.map((row) => (
                  <PreviewRow key={row.label} label={row.label} from={row.from} to={row.to} />
                ))}
              </div>
              {sampleItem ? (
                <p className="text-xs text-slate-500">
                  Pré-visualização com base no primeiro lançamento selecionado (
                  {sampleItem.description}).
                </p>
              ) : null}
            </div>
          )}

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          {step === "preview" ? (
            <>
              <button
                type="button"
                onClick={() => setStep("form")}
                disabled={submitting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800",
                  submitting && "opacity-50",
                )}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirmar alterações
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!updates) {
                    setError("Informe ao menos um campo para alterar.");
                    return;
                  }

                  if (form.formaPagamentoId && isCardPayment && !form.cartaoId) {
                    setError("Selecione o cartão para a forma de pagamento Cartão.");
                    return;
                  }

                  setError(null);
                  setStep("preview");
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Pré-visualizar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
