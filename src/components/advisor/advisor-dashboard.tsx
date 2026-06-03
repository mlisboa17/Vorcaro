"use client";

import { AdvisorMarkdown } from "@/components/advisor/advisor-markdown";
import type { AdvisorAskResponse, AdvisorInsight } from "@/types/financial-advisor";
import { AlertTriangle, Loader2, Send, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils/cn";

type ChatEntry = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: AdvisorAskResponse;
};

export function AdvisorDashboard() {
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [insights, setInsights] = useState<AdvisorInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = useCallback(async () => {
    setLoadingInsights(true);
    try {
      const res = await fetch("/api/advisor/insights");
      if (!res.ok) throw new Error("Falha ao carregar insights");
      const data = (await res.json()) as { insights: AdvisorInsight[] };
      setInsights(data.insights);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro nos insights");
    } finally {
      setLoadingInsights(false);
    }
  }, []);

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
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="min-h-[360px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {chat.length === 0 ? (
            <p className="text-sm text-slate-500">
              Faça uma pergunta sobre suas finanças. Ex.: &quot;Como está meu fluxo de caixa nos próximos 30
              dias?&quot;
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
                    {entry.role === "user" ? "Você" : "Advisor"}
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
                          Baixa confiança — resposta baseada em dados limitados ou indisponíveis.
                        </div>
                      ) : null}
                      <p className="text-xs text-slate-500">
                        Provedor: {entry.meta.provider} · modelo {entry.meta.model} · confiança{" "}
                        {entry.meta.confidence}
                      </p>
                      {entry.meta.usedSources.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {entry.meta.usedSources.map((source) => (
                            <span
                              key={source}
                              className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200"
                            >
                              {source}
                            </span>
                          ))}
                        </div>
                      ) : null}
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
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-violet-600" />
              Insights automáticos
            </h2>
            <button
              type="button"
              onClick={() => void loadInsights()}
              disabled={loadingInsights}
              className="text-xs font-medium text-emerald-700 hover:underline disabled:opacity-50"
            >
              Atualizar
            </button>
          </div>
          {loadingInsights ? (
            <div className="mt-4 flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : insights.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">Clique em Atualizar para gerar insights.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {insights.map((insight) => (
                <li
                  key={insight.id}
                  className={cn(
                    "rounded-lg border p-3 text-sm",
                    insight.severity === "critical"
                      ? "border-red-200 bg-red-50"
                      : insight.severity === "warning"
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-200 bg-slate-50",
                  )}
                >
                  <p className="font-medium text-slate-900">{insight.title}</p>
                  <p className="mt-1 text-slate-700">{insight.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
