"use client";

import { Loader2, Plus, Target } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { FinancialGoalComplete, PlanningSummary } from "@/types/financial-planning";
import { cn } from "@/lib/utils/cn";
import { PlanningGoalFormModal } from "./planning-goal-form-modal";

type GoalsPayload = {
  goals: FinancialGoalComplete[];
  summary: PlanningSummary;
  recommendations: Array<{
    tipo: string;
    titulo: string;
    mensagem: string;
    prioridadeSugerida: string;
    valorSugerido?: string;
  }>;
};

function formatBrl(value: string) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusLabel(status: FinancialGoalComplete["viabilidade"]["statusVisual"]) {
  if (status === "VIAVEL") return { label: "Viável", emoji: "🟢", className: "text-emerald-600" };
  if (status === "ATENCAO") return { label: "Atenção", emoji: "🟡", className: "text-amber-600" };
  if (status === "RISCO_ALTO") return { label: "Risco alto", emoji: "🔴", className: "text-rose-600" };
  return { label: "Atrasada", emoji: "🔴", className: "text-rose-700" };
}

export function PlanningDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GoalsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialGoalComplete | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/planning/goals", { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar metas");
      setData((await res.json()) as GoalsPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="rounded-lg bg-rose-50 px-4 py-3 text-rose-700">{error}</p>;
  }

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Planejamento financeiro</h1>
          <p className="text-sm text-slate-500">
            Metas orientadas a objetivos — estratégia, viabilidade e recomendação
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Nova meta
        </button>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Metas ativas" value={String(summary.metasAtivas)} />
          <MetricCard title="Valor planejado" value={formatBrl(summary.valorTotalPlanejado)} />
          <MetricCard title="Valor acumulado" value={formatBrl(summary.valorAcumulado)} />
          <MetricCard
            title="Progresso global"
            value={`${summary.percentualProgressoGlobal}%`}
          />
        </div>
      )}

      {data && data.recommendations.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
          <h2 className="mb-2 text-sm font-semibold text-amber-900">Priorização sugerida</h2>
          <ul className="space-y-2 text-sm text-amber-950">
            {data.recommendations.map((r) => (
              <li key={`${r.tipo}-${r.titulo}`}>
                <strong>{r.titulo}:</strong> {r.mensagem}
                {r.valorSugerido ? ` (sugestão: ${formatBrl(r.valorSugerido)})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {(data?.goals ?? []).map((goal) => {
          const st = statusLabel(goal.viabilidade.statusVisual);
          const pct = goal.estrategia.percentualConcluido;
          return (
            <article
              key={goal.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">Prioridade #{goal.ordemPrioridade}</p>
                  <h2 className="text-lg font-semibold text-slate-900">{goal.nome}</h2>
                  <p className="text-xs text-slate-500">{goal.tipo}</p>
                </div>
                <span className={cn("text-sm font-medium", st.className)}>
                  {st.emoji} {st.label}
                </span>
              </div>

              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-slate-600">
                  <span>{pct}% concluído</span>
                  <span>
                    {formatBrl(goal.valorAtual)} / {formatBrl(goal.valorObjetivo)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <LayerBlock title="Estratégia">
                  {goal.aporteMensal
                    ? `Aporte: ${formatBrl(goal.aporteMensal)}/mês`
                    : goal.estrategia.aporteNecessario
                      ? `Necessário: ${formatBrl(goal.estrategia.aporteNecessario)}/mês`
                      : "Defina aporte ou data"}
                  {goal.estrategia.mesesRestantes != null && (
                    <p className="mt-1 text-xs text-slate-500">
                      ~{goal.estrategia.mesesRestantes} meses
                    </p>
                  )}
                </LayerBlock>
                <LayerBlock title="Viabilidade">
                  <p>{goal.viabilidade.viavel ? "Sustentável no caixa" : "Margem insuficiente"}</p>
                  <p className="text-xs text-slate-500">
                    Margem livre: {formatBrl(goal.viabilidade.margemLivreMensal)} · Comprometimento:{" "}
                    {goal.viabilidade.percentualComprometimento}%
                  </p>
                </LayerBlock>
                <LayerBlock title="Recomendação">
                  <p className="line-clamp-4">{goal.recomendacao.mensagem}</p>
                </LayerBlock>
              </div>

              {goal.recomendacao.otimizacao && (
                <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  {goal.recomendacao.otimizacao.mensagem}
                </p>
              )}

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="text-sm text-emerald-600 hover:underline"
                  onClick={() => {
                    setEditing(goal);
                    setModalOpen(true);
                  }}
                >
                  Editar meta
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {(data?.goals.length ?? 0) === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-500">
          <Target className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Nenhuma meta cadastrada ainda.
        </p>
      )}

      <PlanningGoalFormModal
        open={modalOpen}
        goal={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          setModalOpen(false);
          setEditing(null);
          void load();
        }}
      />
    </div>
  );
}

function LayerBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-1 text-sm text-slate-700">{children}</div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
