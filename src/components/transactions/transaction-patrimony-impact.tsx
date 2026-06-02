"use client";

import type { PatrimonyLiabilityDto } from "@/types/patrimony";
import {
  ALLOCATION_TYPES,
  type AllocationType,
  type TransactionAllocation,
} from "@/lib/financial/liability-payment-metadata";
import { useEffect, useState } from "react";

const ALLOCATION_LABELS: Record<AllocationType, string> = {
  AMORTIZACAO: "Amortização",
  JUROS: "Juros",
  SEGURO: "Seguro",
  TAXA: "Taxa",
};

export interface PatrimonyImpactState {
  enabled: boolean;
  liabilityId: string;
  allocations: Record<AllocationType, string>;
}

export function emptyPatrimonyImpactState(): PatrimonyImpactState {
  return {
    enabled: false,
    liabilityId: "",
    allocations: Object.fromEntries(ALLOCATION_TYPES.map((t) => [t, ""])) as Record<
      AllocationType,
      string
    >,
  };
}

export function patrimonyImpactFromTransaction(
  liabilityId: string | null | undefined,
  allocations?: TransactionAllocation[] | null,
): PatrimonyImpactState {
  const state = emptyPatrimonyImpactState();

  if (!liabilityId) {
    return state;
  }

  state.enabled = true;
  state.liabilityId = liabilityId;

  for (const row of allocations ?? []) {
    state.allocations[row.tipo] = String(row.valor);
  }

  return state;
}

export function parsePatrimonyImpactState(state: PatrimonyImpactState): {
  liabilityId?: string;
  allocations?: TransactionAllocation[];
} {
  if (!state.enabled || !state.liabilityId) {
    return {};
  }

  const allocations = ALLOCATION_TYPES.map((tipo) => ({
    tipo,
    valor: Number(state.allocations[tipo] || 0),
  })).filter((row) => Number.isFinite(row.valor) && row.valor > 0);

  return {
    liabilityId: state.liabilityId,
    allocations: allocations.length > 0 ? allocations : undefined,
  };
}

const inputClassName =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

interface TransactionPatrimonyImpactProps {
  state: PatrimonyImpactState;
  onChange: (state: PatrimonyImpactState) => void;
  liabilities?: PatrimonyLiabilityDto[];
  parcelaValor?: number;
}

export function TransactionPatrimonyImpactSection({
  state,
  onChange,
  liabilities: liabilitiesProp,
  parcelaValor,
}: TransactionPatrimonyImpactProps) {
  const [liabilities, setLiabilities] = useState<PatrimonyLiabilityDto[]>(liabilitiesProp ?? []);

  useEffect(() => {
    if (liabilitiesProp) {
      setLiabilities(liabilitiesProp);
      return;
    }

    void fetch("/api/patrimony/liabilities", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((payload: { items?: PatrimonyLiabilityDto[] }) => {
        setLiabilities(payload.items ?? []);
      })
      .catch(() => setLiabilities([]));
  }, [liabilitiesProp]);

  const allocationSum = ALLOCATION_TYPES.reduce(
    (sum, tipo) => sum + Number(state.allocations[tipo] || 0),
    0,
  );

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Impacto patrimonial</h3>
        <label className="inline-flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={state.enabled}
            onChange={(event) =>
              onChange({
                ...state,
                enabled: event.target.checked,
                liabilityId: event.target.checked ? state.liabilityId : "",
              })
            }
            className="rounded border-slate-300"
          />
          Pagamento de passivo
        </label>
      </div>

      {state.enabled ? (
        <>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Passivo vinculado</span>
            <select
              className={inputClassName}
              value={state.liabilityId}
              onChange={(event) => onChange({ ...state, liabilityId: event.target.value })}
            >
              <option value="">Selecione...</option>
              {liabilities.map((liability) => (
                <option key={liability.id} value={liability.id}>
                  {liability.nome} — saldo {liability.saldoAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </option>
              ))}
            </select>
          </label>

          <p className="text-xs text-slate-500">
            Somente o valor em <strong>Amortização</strong> reduz o saldo devedor. Juros, seguro e taxa
            impactam a DRE.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {ALLOCATION_TYPES.map((tipo) => (
              <label key={tipo} className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">{ALLOCATION_LABELS[tipo]}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClassName}
                  value={state.allocations[tipo]}
                  onChange={(event) =>
                    onChange({
                      ...state,
                      allocations: { ...state.allocations, [tipo]: event.target.value },
                    })
                  }
                />
              </label>
            ))}
          </div>

          {parcelaValor !== undefined && allocationSum > parcelaValor + 0.01 ? (
            <p className="text-xs text-amber-700">
              A soma dos componentes ({allocationSum.toFixed(2)}) excede o valor da parcela (
              {parcelaValor.toFixed(2)}).
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-xs text-slate-500">
          Ative para vincular esta parcela a um financiamento ou empréstimo e informar amortização vs.
          juros.
        </p>
      )}
    </section>
  );
}
