"use client";

import type { FinanceCatalog } from "@/types/inbox";
import type { PatrimonyLiabilityDto } from "@/types/patrimony";
import type { RecurringTransactionItem } from "@/types/recurring";
import { FREQUENCIA_LABELS } from "@/types/recurring";
import { Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { flattenCatalogCategories } from "@/lib/categories/category-utils";
import { isCardPaymentMethodType } from "@/modules/financial-instruments/domain/utils/payment-method-type.mapper";
import {
  emptyPatrimonyImpactState,
  parsePatrimonyImpactState,
  patrimonyImpactFromTransaction,
  TransactionPatrimonyImpactSection,
} from "@/components/transactions/transaction-patrimony-impact";

interface RecurringFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  catalog: FinanceCatalog;
  item?: RecurringTransactionItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const FREQUENCIAS = [
  "SEMANAL",
  "QUINZENAL",
  "MENSAL",
  "BIMESTRAL",
  "TRIMESTRAL",
  "SEMESTRAL",
  "ANUAL",
] as const;

export function RecurringFormModal({
  open,
  mode,
  catalog,
  item,
  onClose,
  onSaved,
}: RecurringFormModalProps) {
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"DESPESA" | "RECEITA">("DESPESA");
  const [valor, setValor] = useState("");
  const [frequencia, setFrequencia] = useState<(typeof FREQUENCIAS)[number]>("MENSAL");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [contaFinanceiraId, setContaFinanceiraId] = useState("");
  const [formaPagamentoId, setFormaPagamentoId] = useState("");
  const [cartaoId, setCartaoId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [patrimony, setPatrimony] = useState(emptyPatrimonyImpactState);
  const [liabilities, setLiabilities] = useState<PatrimonyLiabilityDto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = useMemo(() => {
    const all = flattenCatalogCategories(catalog.categories);
    const filteredType = tipo === "DESPESA" ? "DESPESA" : "RECEITA";
    return all.filter((category) => {
      const record = catalog.categories.find((entry) => entry.id === category.id);
      return record?.type === filteredType;
    });
  }, [catalog.categories, tipo]);

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
    setDescricao(item?.descricao ?? "");
    setTipo(item?.tipo ?? "DESPESA");
    setValor(item?.valor?.toString() ?? "");
    setFrequencia(item?.frequencia ?? "MENSAL");
    setDataInicio(item?.dataInicio ?? new Date().toISOString().slice(0, 10));
    setDataFim(item?.dataFim ?? "");
    setCategoriaId(item?.categoriaId ?? "");
    setContaFinanceiraId(item?.contaFinanceiraId ?? "");
    setFormaPagamentoId(item?.formaPagamentoId ?? "");
    setCartaoId(item?.cartaoId ?? "");
    setObservacoes(item?.observacoes ?? "");
    setPatrimony(
      patrimonyImpactFromTransaction(item?.liabilityId, item?.defaultAllocations ?? undefined),
    );
  }, [open, item]);

  useEffect(() => {
    if (!open) {
      return;
    }

    void fetch("/api/patrimony/liabilities", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((payload: { items?: PatrimonyLiabilityDto[] }) => {
        setLiabilities(payload.items ?? []);
      })
      .catch(() => setLiabilities([]));
  }, [open]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      const parsedValor = Number(valor);
      if (!descricao.trim()) throw new Error("Informe a descrição");
      if (!Number.isFinite(parsedValor) || parsedValor <= 0) {
        throw new Error("Informe um valor válido");
      }
      if (!dataInicio) throw new Error("Informe a data de início");
      if (!categoriaId) throw new Error("Selecione a categoria");
      if (!contaFinanceiraId) throw new Error("Selecione a conta financeira");
      if (!formaPagamentoId) throw new Error("Selecione a forma de pagamento");
      if (showCardField && !cartaoId) throw new Error("Selecione o cartão");

      const payload = {
        descricao: descricao.trim(),
        tipo,
        valor: parsedValor,
        frequencia,
        dataInicio,
        dataFim: dataFim || undefined,
        categoriaId,
        contaFinanceiraId,
        formaPagamentoId,
        cartaoId: showCardField ? cartaoId : undefined,
        ...(() => {
          const patrimonyPayload = parsePatrimonyImpactState(patrimony);
          return {
            liabilityId: patrimonyPayload.liabilityId,
            defaultAllocations: patrimonyPayload.allocations,
          };
        })(),
        observacoes: observacoes.trim() || undefined,
      };

      const response = await fetch(
        mode === "create"
          ? "/api/config/lancamentos-recorrentes"
          : `/api/config/lancamentos-recorrentes/${item?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(typeof body?.error === "string" ? body.error : "Falha ao salvar");
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado");
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {mode === "create" ? "Nova recorrência" : "Editar recorrência"}
              </h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          <div className="space-y-3">
            <Field label="Descrição">
              <input
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <select
                  value={tipo}
                  onChange={(event) => setTipo(event.target.value as "DESPESA" | "RECEITA")}
                  className={inputClass}
                >
                  <option value="DESPESA">Despesa</option>
                  <option value="RECEITA">Receita</option>
                </select>
              </Field>
              <Field label="Valor">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valor}
                  onChange={(event) => setValor(event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Frequência">
                <select
                  value={frequencia}
                  onChange={(event) =>
                    setFrequencia(event.target.value as (typeof FREQUENCIAS)[number])
                  }
                  className={inputClass}
                >
                  {FREQUENCIAS.map((entry) => (
                    <option key={entry} value={entry}>
                      {FREQUENCIA_LABELS[entry]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Data início">
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(event) => setDataInicio(event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Data fim (opcional)">
              <input
                type="date"
                value={dataFim}
                onChange={(event) => setDataFim(event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Categoria">
              <select
                value={categoriaId}
                onChange={(event) => setCategoriaId(event.target.value)}
                className={inputClass}
              >
                <option value="">Selecione...</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Conta financeira">
              <select
                value={contaFinanceiraId}
                onChange={(event) => setContaFinanceiraId(event.target.value)}
                className={inputClass}
              >
                <option value="">Selecione...</option>
                {catalog.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Forma de pagamento">
              <select
                value={formaPagamentoId}
                onChange={(event) => {
                  setFormaPagamentoId(event.target.value);
                  setCartaoId("");
                }}
                className={inputClass}
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
                  value={cartaoId}
                  onChange={(event) => setCartaoId(event.target.value)}
                  className={inputClass}
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

            <TransactionPatrimonyImpactSection
              state={patrimony}
              onChange={setPatrimony}
              liabilities={liabilities}
              parcelaValor={Number(valor) || undefined}
            />

            <Field label="Observações">
              <textarea
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
                rows={2}
                className={inputClass}
              />
            </Field>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50",
              )}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900";
