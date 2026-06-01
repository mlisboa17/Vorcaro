"use client";

import type { InboxDetailResponse, FinanceCatalog, InboxItem } from "@/types/inbox";
import type { ExtractedTransactionType } from "@/modules/financial-inbox/domain/ports/ai-service.port";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfidenceField } from "./confidence-field";
import { InboxChannelBadge } from "./inbox-channel-badge";
import { InboxStatusBadge } from "./inbox-status-badge";
import { cn } from "@/lib/utils/cn";
import {
  flattenCatalogCategories,
  resolveCategoryIdFromCatalog,
} from "@/lib/categories/category-utils";

interface ConfirmTransactionDrawerProps {
  item: InboxItem | null;
  catalog: FinanceCatalog;
  open: boolean;
  onClose: () => void;
  onConfirmed: (itemId: string) => void;
}

interface ConfirmFormState {
  accountId: string;
  type: ExtractedTransactionType;
  amount: string;
  description: string;
  date: string;
  categoryId: string;
  paymentMethodId: string;
  cardId: string;
  installments: string;
}

const TRANSACTION_TYPES: ExtractedTransactionType[] = ["EXPENSE", "INCOME", "TRANSFER"];

export function ConfirmTransactionDrawer({
  item,
  catalog,
  open,
  onClose,
  onConfirmed,
}: ConfirmTransactionDrawerProps) {
  const [detail, setDetail] = useState<InboxDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ConfirmFormState>({
    accountId: "",
    type: "EXPENSE",
    amount: "",
    description: "",
    date: "",
    categoryId: "",
    paymentMethodId: "",
    cardId: "",
    installments: "1",
  });

  useEffect(() => {
    if (!open || !item) {
      return;
    }

    setSuccess(false);
    setError(null);
    setLoadingDetail(true);

    fetch(`/api/inbox/${item.id}`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar os dados de extração");
        }
        return response.json() as Promise<InboxDetailResponse>;
      })
      .then((data) => {
        setDetail(data);
        const extraction = data.extractionResult?.extractedData;
        const cashWallet =
          catalog.accounts.find((account) => account.type === "CARTEIRA_DINHEIRO") ??
          catalog.accounts.find((account) =>
            account.name.toLowerCase().includes("carteira dinheiro"),
          );
        const defaultAccount =
          catalog.accounts.find((account) => account.name.includes("Principal")) ??
          catalog.accounts[0];
        const matchedCategoryId =
          extraction?.categoryId ??
          resolveCategoryIdFromCatalog(catalog.categories, {
            categoriaPrincipal: extraction?.categoriaPrincipal,
            subcategoria: extraction?.subcategoria,
            category: extraction?.category,
          });
        const matchedPayment = catalog.paymentMethods.find(
          (method) =>
            method.name.toLowerCase() === extraction?.paymentMethod?.toLowerCase(),
        );
        const isCashPayment =
          extraction?.paymentMethodType === "DINHEIRO" ||
          matchedPayment?.type === "DINHEIRO" ||
          matchedPayment?.type === "CASH";

        setForm({
          accountId:
            extraction?.financialAccountId ??
            (isCashPayment ? cashWallet?.id : defaultAccount?.id) ??
            "",
          type:
            extraction?.type && extraction.type !== "UNKNOWN"
              ? extraction.type
              : "EXPENSE",
          amount: extraction?.amount?.toString() ?? "",
          description: extraction?.description ?? item.rawContent,
          date: extraction?.date ?? new Date().toISOString().slice(0, 10),
          categoryId: matchedCategoryId ?? "",
          paymentMethodId:
            extraction?.paymentMethodId ??
            matchedPayment?.id ??
            catalog.paymentMethods.find((method) => method.isDefault)?.id ??
            "",
          cardId: extraction?.cardId ?? "",
          installments: extraction?.installments?.toString() ?? "1",
        });
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Erro ao carregar");
      })
      .finally(() => setLoadingDetail(false));
  }, [open, item, catalog]);

  async function handleConfirm() {
    if (!item) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        accountId: form.accountId || undefined,
        type: form.type,
        amount: Number(form.amount),
        description: form.description,
        date: form.date,
        categoryId: form.categoryId || undefined,
        paymentMethodId: form.paymentMethodId || undefined,
        cardId: form.cardId || undefined,
        installments: Number(form.installments) || 1,
      };

      const response = await fetch(`/api/inbox/${item.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(typeof body.error === "string" ? body.error : "Falha na confirmação");
      }

      setSuccess(true);
      setTimeout(() => {
        onConfirmed(item.id);
        onClose();
      }, 900);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !item) {
    return null;
  }

  const confidence = detail?.extractionResult?.confidence.fields ?? {};
  const categoryOptions = flattenCatalogCategories(catalog.categories);

  return (
    <>
      <button
        type="button"
        aria-label="Fechar painel"
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl transition-transform",
        )}
      >
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Revisar e Efetivar</h2>
            <div className="flex flex-wrap gap-2">
              <InboxChannelBadge channel={item.channel} />
              <InboxStatusBadge status={item.status} />
            </div>
            <p className="text-sm text-slate-500">{item.rawContent}</p>
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
          {loadingDetail ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <ConfidenceField label="Conta" fieldKey="accountId" confidence={undefined}>
                <select
                  id="accountId"
                  value={form.accountId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, accountId: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {catalog.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </ConfidenceField>

              <ConfidenceField label="Tipo" fieldKey="type" confidence={confidence.type}>
                <select
                  id="type"
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value as ExtractedTransactionType,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {TRANSACTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </ConfidenceField>

              <ConfidenceField label="Valor (R$)" fieldKey="amount" confidence={confidence.amount}>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, amount: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                />
              </ConfidenceField>

              <ConfidenceField
                label="Descrição"
                fieldKey="description"
                confidence={confidence.description}
              >
                <input
                  id="description"
                  type="text"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                />
              </ConfidenceField>

              <ConfidenceField label="Data" fieldKey="date" confidence={confidence.date}>
                <input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, date: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                />
              </ConfidenceField>

              <ConfidenceField label="Categoria" fieldKey="category" confidence={confidence.category}>
                <select
                  id="categoryId"
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, categoryId: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">Selecione...</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </ConfidenceField>

              <ConfidenceField
                label="Forma de pagamento"
                fieldKey="paymentMethod"
                confidence={confidence.paymentMethod}
              >
                <select
                  id="paymentMethodId"
                  value={form.paymentMethodId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, paymentMethodId: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">Selecione...</option>
                  {catalog.paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </ConfidenceField>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}

              {success && (
                <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Transação confirmada com sucesso!
                </p>
              )}
            </div>
          )}
        </div>

        <footer className="border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            disabled={submitting || loadingDetail || success}
            onClick={handleConfirm}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirmar Transação
          </button>
        </footer>
      </aside>
    </>
  );
}
