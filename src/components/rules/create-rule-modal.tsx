"use client";

import type { CreateRuleFormValues } from "@/types/rules";
import {
  ACTION_FIELD_OPTIONS,
  CONDITION_FIELD_OPTIONS,
  CONDITION_OPERATOR_OPTIONS,
  TRANSACTION_TYPE_OPTIONS,
} from "@/types/rules";
import type { RuleAction, RuleCondition } from "@/modules/financial-inbox/domain/schemas/user-rule.schema";
import { buildRuleNameFromForm } from "@/lib/utils/rule-labels";
import { cn } from "@/lib/utils/cn";
import { Loader2, Plus, Sliders, X } from "lucide-react";
import { useMemo, useState } from "react";

interface CreateRuleModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const DEFAULT_FORM: CreateRuleFormValues = {
  name: "",
  conditionField: "description",
  conditionOperator: "contains",
  conditionValue: "",
  actionField: "category",
  actionValue: "",
  priority: 50,
};

function buildPayload(form: CreateRuleFormValues): {
  condition: RuleCondition;
  action: RuleAction;
  name: string;
  priority: number;
} | { error: string } {
  if (!form.conditionValue.trim()) {
    return { error: "Informe o valor da condição." };
  }

  if (!form.actionValue.trim()) {
    return { error: "Informe o valor da ação." };
  }

  const condition: RuleCondition = {
    field: form.conditionField,
    operator: form.conditionOperator,
    value: form.conditionValue.trim(),
  };

  let action: RuleAction;

  if (form.actionField === "amount") {
    const amount = Number(form.actionValue.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: "Informe um valor numérico válido para a ação." };
    }
    action = { set: "amount", value: amount };
  } else if (form.actionField === "type") {
    action = {
      set: "type",
      value: form.actionValue as "EXPENSE" | "INCOME" | "TRANSFER",
    };
  } else if (form.actionField === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.actionValue.trim())) {
      return { error: "Use o formato AAAA-MM-DD para a data." };
    }
    action = { set: "date", value: form.actionValue.trim() };
  } else {
    action = {
      set: form.actionField,
      value: form.actionValue.trim(),
    };
  }

  const name = form.name.trim() || buildRuleNameFromForm(condition, action);

  return { condition, action, name, priority: form.priority };
}

export function CreateRuleModal({ open, onClose, onCreated }: CreateRuleModalProps) {
  const [form, setForm] = useState<CreateRuleFormValues>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    const payload = buildPayload(form);
    if ("error" in payload) {
      return null;
    }

    return payload;
  }, [form]);

  if (!open) {
    return null;
  }

  function updateForm<K extends keyof CreateRuleFormValues>(key: K, value: CreateRuleFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const payload = buildPayload(form);
    if ("error" in payload) {
      setError(payload.error);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/rules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          condition: payload.condition,
          action: payload.action,
          priority: payload.priority,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
        const message =
          typeof body?.error === "string"
            ? body.error
            : "Não foi possível criar a regra.";
        throw new Error(message);
      }

      setForm(DEFAULT_FORM);
      onCreated();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Nova Regra Manual</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
          <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Condição (quando)
            </legend>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-slate-600">Campo</span>
                <select
                  value={form.conditionField}
                  onChange={(event) =>
                    updateForm("conditionField", event.target.value as CreateRuleFormValues["conditionField"])
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {CONDITION_FIELD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-600">Operador</span>
                <select
                  value={form.conditionOperator}
                  onChange={(event) =>
                    updateForm(
                      "conditionOperator",
                      event.target.value as CreateRuleFormValues["conditionOperator"],
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {CONDITION_OPERATOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-600">Valor gatilho</span>
                <input
                  value={form.conditionValue}
                  onChange={(event) => updateForm("conditionValue", event.target.value)}
                  placeholder='Ex: "posto"'
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
              Ação (então)
            </legend>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-600">Definir campo</span>
                <select
                  value={form.actionField}
                  onChange={(event) =>
                    updateForm("actionField", event.target.value as CreateRuleFormValues["actionField"])
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {ACTION_FIELD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-600">Valor desejado</span>
                {form.actionField === "type" ? (
                  <select
                    value={form.actionValue}
                    onChange={(event) => updateForm("actionValue", event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Selecione…</option>
                    {TRANSACTION_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.actionValue}
                    onChange={(event) => updateForm("actionValue", event.target.value)}
                    placeholder={
                      form.actionField === "date"
                        ? "2026-05-30"
                        : form.actionField === "amount"
                          ? "50.00"
                          : 'Ex: "Alimentação"'
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                )}
              </label>
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-600">Nome (opcional)</span>
              <input
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="Nome amigável da regra"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-600">Prioridade</span>
              <input
                type="number"
                min={0}
                max={1000}
                value={form.priority}
                onChange={(event) => updateForm("priority", Number(event.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {preview && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="font-medium text-slate-700">Prévia:</span>{" "}
              {preview.name}
            </div>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white",
                submitting && "opacity-70",
              )}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar regra
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
