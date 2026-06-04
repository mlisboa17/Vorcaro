"use client";

import Link from "next/link";
import { AdvisorMarkdown } from "@/components/advisor/advisor-markdown";
import type { AdvisorAskResponse, AdvisorInsight } from "@/types/financial-advisor";
import type { AdvisorConsultationResponse } from "@/types/advisor-consultant";
import { HEALTH_SCORE_LABELS } from "@/types/advisor-consultant";
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  Send,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

type ChatEntry = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: AdvisorAskResponse;
};

type ConsultationPayload = AdvisorConsultationResponse & { insights: AdvisorInsight[] };

const SCORE_COLORS: Record<string, string> = {
  EXCELENTE: "text-emerald-600",
  SAUDAVEL: "text-emerald-700",
  ATENCAO: "text-amber-600",
  CRITICA: "text-rose-600",
};

export function AdvisorDashboard() {
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [consultation, setConsultation] = useState<ConsultationPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingConsultation, setLoadingConsultation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConsultation = useCallback(async () => {
    setLoadingConsultation(true);
    try {
      const res = await fetch("/api/advisor/insights");
      if (!res.ok) throw new Error("Falha ao carregar consultoria");
      const data = (await res.json()) as ConsultationPayload;
      setConsultation(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro na consultoria");
    } finally {
      setLoadingConsultation(false);
    }
  }, []);

  useEffect(() => {
    void loadConsultation();
  }, [loadConsultation]);

  async function handleAsk(event: React.FormEvent) {
    event.preventDefault();
    const q = question.trim();
    if (!q || loading) return;

    setError(null);
    setLoading(true);
    setChat((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: q }]);
    setQuestion("");

    try {
      const res = await fetch("/api/advisor/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (res.status === 400) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Requisição inválida");
      }
      if (!res.ok) throw new Error("Falha ao consultar o advisor");

      const data = (await res.json()) as AdvisorAskResponse;
      setChat((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.answer,
          meta: data,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar pergunta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {consultation ? (
        <section className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Sparkles className="h-5 w-5 text-violet-600" />
                Consultor Financeiro
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-700">{consultation.summary}</p>
            </div>
            <div className="text-center">
              <p
                className={cn(
                  "text-4xl font-bold",
                  SCORE_COLORS[consultation.healthScore.classification],
                )}
              >
                {consultation.healthScore.score}
              </p>
              <p className="text-xs text-slate-500">Score financeiro</p>
              <p className="text-sm font-medium text-slate-800">
                {HEALTH_SCORE_LABELS[consultation.healthScore.classification]}
              </p>
            </div>
          </div>

          {consultation.savingsOpportunities.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Top 3 economias do mês
              </p>
              <ol className="mt-2 space-y-2">
                {consultation.savingsOpportunities.map((s) => (
                  <li key={s.rank} className="flex gap-2 text-sm text-slate-800">
                    <span className="font-bold text-emerald-600">{s.rank}.</span>
                    <span>
                      {s.title}{" "}
                      <span className="font-medium text-emerald-700">
                        (+{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(s.estimatedMonthlySavings)}/mês)
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="min-h-[360px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {chat.length === 0 ? (
              <p className="text-sm text-slate-500">
                Faça uma pergunta sobre suas finanças. O consultor usa apenas dados e ações geradas
                pelo sistema.
              </p>
            ) : (
              <div className="space-y-4">
                {chat.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "rounded-lg p-3",
                      entry.role === "user" ? "bg-slate-100" : "bg-emerald-50/60",
                    )}
                  >
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                      {entry.role === "user" ? "Você" : "Consultor"}
                    </p>
                    {entry.role === "assistant" ? (
                      <AdvisorMarkdown text={entry.content} />
                    ) : (
                      <p className="text-sm text-slate-800">{entry.content}</p>
                    )}
                    {entry.meta ? (
                      <div className="mt-3 space-y-2 border-t border-emerald-200/60 pt-3">
                        {entry.meta.confidence === "LOW" ? (
                          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            Baixa confiança — resposta baseada em dados limitados.
                          </div>
                        ) : null}
                        <p className="text-xs text-slate-500">
                          {entry.meta.provider} · {entry.meta.model} · {entry.meta.confidence}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={(e) => void handleAsk(e)} className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Sua pergunta financeira..."
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </button>
          </form>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Ações recomendadas</h2>
              <button
                type="button"
                onClick={() => void loadConsultation()}
                disabled={loadingConsultation}
                className="text-xs font-medium text-emerald-700 hover:underline disabled:opacity-50"
              >
                Atualizar
              </button>
            </div>
            {loadingConsultation ? (
              <div className="mt-4 flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : consultation && consultation.actions.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {consultation.actions.slice(0, 8).map((action) => (
                  <li
                    key={action.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm"
                  >
                    <p className="font-medium text-slate-900">{action.title}</p>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">{action.description}</p>
                    {action.target ? (
                      <Link
                        href={action.target}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                      >
                        Abrir
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-slate-500">Nenhuma ação pendente.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <TrendingDown className="h-4 w-4 text-amber-600" />
              Riscos
            </h2>
            {consultation && consultation.risks.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {consultation.risks.slice(0, 6).map((risk) => (
                  <li
                    key={risk.id}
                    className={cn(
                      "rounded-lg border p-2 text-xs",
                      risk.severity === "critical"
                        ? "border-red-200 bg-red-50"
                        : "border-amber-100 bg-amber-50",
                    )}
                  >
                    <p className="font-medium">{risk.title}</p>
                    <p className="mt-0.5 text-slate-600">{risk.description}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-slate-500">Sem riscos destacados.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
