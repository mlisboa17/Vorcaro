"use client";

import type { FinanceCatalog } from "@/types/inbox";
import type { RecurringTransactionItem, RecurringTransactionListResponse } from "@/types/recurring";
import { FREQUENCIA_LABELS, TIPO_LABELS } from "@/types/recurring";
import { Loader2, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { flattenCatalogCategories } from "@/lib/categories/category-utils";
import { RecurringFormModal } from "./recurring-form-modal";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function RecurringDashboard() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [items, setItems] = useState<RecurringTransactionItem[]>([]);
  const [catalog, setCatalog] = useState<FinanceCatalog>({
    accounts: [],
    categories: [],
    paymentMethods: [],
    cards: [],
  });
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<RecurringTransactionItem | null>(null);

  const categoryLabels = useMemo(
    () => new Map(flattenCatalogCategories(catalog.categories).map((entry) => [entry.id, entry.label])),
    [catalog.categories],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [recurringResponse, catalogResponse] = await Promise.all([
        fetch("/api/config/lancamentos-recorrentes", { credentials: "include" }),
        fetch("/api/finance/catalog", { credentials: "include" }),
      ]);

      if (!recurringResponse.ok) {
        throw new Error("Não foi possível carregar as recorrências");
      }

      const payload = (await recurringResponse.json()) as RecurringTransactionListResponse;
      setItems(payload.items ?? []);

      if (catalogResponse.ok) {
        setCatalog((await catalogResponse.json()) as FinanceCatalog);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleProcess() {
    setProcessing(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/transactions/recurring/process", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(typeof body?.error === "string" ? body.error : "Falha ao processar");
      }

      const result = (await response.json()) as { created: number; skipped: number };
      setMessage(`${result.created} transação(ões) criadas · ${result.skipped} ignoradas`);
      await loadData();
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : "Erro inesperado");
    } finally {
      setProcessing(false);
    }
  }

  async function handleDeactivate(item: RecurringTransactionItem) {
    if (!window.confirm(`Desativar recorrência "${item.descricao}"?`)) {
      return;
    }

    const response = await fetch(`/api/config/lancamentos-recorrentes/${item.id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(typeof body?.error === "string" ? body.error : "Falha ao desativar");
      return;
    }

    await loadData();
  }

  function openCreate() {
    setFormMode("create");
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEdit(item: RecurringTransactionItem) {
    setFormMode("edit");
    setEditingItem(item);
    setFormOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Despesas Recorrentes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Aluguel, contas fixas, assinaturas e receitas periódicas — com processamento automático.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleProcess()}
            disabled={processing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Processar vencidas
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Nova recorrência
          </button>
        </div>
      </header>

      {message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Nenhuma recorrência cadastrada.
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className={cn(
                "rounded-xl border bg-white p-4 shadow-sm",
                item.estaAtivo ? "border-slate-200" : "border-slate-100 opacity-60",
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-900">{item.descricao}</h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {TIPO_LABELS[item.tipo]}
                    </span>
                    {!item.estaAtivo ? (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Inativa
                      </span>
                    ) : null}
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{formatCurrency(item.valor)}</p>
                  <p className="text-sm text-slate-600">
                    {FREQUENCIA_LABELS[item.frequencia]} · Próxima execução:{" "}
                    <strong>{formatDate(item.proximaExecucao)}</strong>
                  </p>
                  <p className="text-sm text-slate-500">
                    Categoria: {categoryLabels.get(item.categoriaId) ?? "—"}
                  </p>
                </div>

                {item.estaAtivo ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeactivate(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Desativar
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>

      <RecurringFormModal
        open={formOpen}
        mode={formMode}
        catalog={catalog}
        item={editingItem}
        onClose={() => setFormOpen(false)}
        onSaved={() => void loadData()}
      />
    </div>
  );
}
