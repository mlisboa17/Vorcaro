"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FinancialGoalComplete } from "@/types/financial-planning";

const TIPOS = [
  "EMERGENCY_FUND",
  "VEHICLE",
  "REAL_ESTATE",
  "DEBT_SETTLEMENT",
  "EDUCATION",
  "RETIREMENT",
  "CUSTOM",
] as const;

const PRIORIDADES = ["LOW", "MEDIUM", "HIGH"] as const;

type Props = {
  open: boolean;
  goal: FinancialGoalComplete | null;
  onClose: () => void;
  onSaved: () => void;
};

export function PlanningGoalFormModal({ open, goal, onClose, onSaved }: Props) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("CUSTOM");
  const [valorObjetivo, setValorObjetivo] = useState("");
  const [valorAtual, setValorAtual] = useState("0");
  const [aporteMensal, setAporteMensal] = useState("");
  const [dataObjetivo, setDataObjetivo] = useState("");
  const [prioridade, setPrioridade] = useState<(typeof PRIORIDADES)[number]>("MEDIUM");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (goal) {
      setNome(goal.nome);
      setTipo(goal.tipo);
      setValorObjetivo(goal.valorObjetivo);
      setValorAtual(goal.valorAtual);
      setAporteMensal(goal.aporteMensal ?? "");
      setDataObjetivo(goal.dataObjetivo ? goal.dataObjetivo.slice(0, 10) : "");
      setPrioridade(goal.prioridade);
    } else {
      setNome("");
      setTipo("CUSTOM");
      setValorObjetivo("");
      setValorAtual("0");
      setAporteMensal("");
      setDataObjetivo("");
      setPrioridade("MEDIUM");
    }
    setError(null);
  }, [open, goal]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const body = {
      nome,
      tipo,
      valorObjetivo,
      valorAtual,
      prioridade,
      aporteMensal: aporteMensal.trim() ? aporteMensal : null,
      dataObjetivo: dataObjetivo ? new Date(dataObjetivo).toISOString() : null,
    };

    try {
      const url = goal ? `/api/planning/goals/${goal.id}` : "/api/planning/goals";
      const res = await fetch(url, {
        method: goal ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(typeof err.error === "string" ? err.error : "Falha ao salvar");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{goal ? "Editar meta" : "Nova meta"}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nome">
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </Field>
          <Field label="Tipo">
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as (typeof TIPOS)[number])}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor objetivo">
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={valorObjetivo}
                onChange={(e) => setValorObjetivo(e.target.value)}
                placeholder="10000.00"
                required
              />
            </Field>
            <Field label="Valor atual">
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={valorAtual}
                onChange={(e) => setValorAtual(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Aporte mensal (opcional)">
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={aporteMensal}
                onChange={(e) => setAporteMensal(e.target.value)}
                placeholder="500.00"
              />
            </Field>
            <Field label="Data objetivo (opcional)">
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={dataObjetivo}
                onChange={(e) => setDataObjetivo(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Prioridade">
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as (typeof PRIORIDADES)[number])}
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
