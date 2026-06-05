"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import type { VorcaroSelfCorrectionDiagnostic } from "@/modules/vorcaro/conversation/domain/types/vorcaro-conversation-context";
import type { VorcaroIntentObservabilitySnapshot } from "@/modules/vorcaro/intent/domain/types/vorcaro-intent";

type DiagnosticsResponse = {
  metrics: VorcaroIntentObservabilitySnapshot;
  lastDiagnostic: VorcaroSelfCorrectionDiagnostic | null;
};

export function VorcaroDebugDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DiagnosticsResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vorcaro/debug/diagnostics");
      if (res.status === 403) {
        setError("Acesso restrito a administradores.");
        return;
      }
      if (!res.ok) {
        throw new Error("Falha ao carregar diagnóstico");
      }
      setData((await res.json()) as DiagnosticsResponse);
    } catch {
      setError("Não foi possível carregar o painel de diagnóstico.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/vorcaro"
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao hub Vorcaro
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">Diagnóstico conversacional</h1>
          <p className="mt-1 text-sm text-slate-500">
            Intent, ferramenta, tópico, score do critic e motivos de reprovação (admin).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </header>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </div>
      ) : data ? (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Métricas de autoconsciência</h2>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {Object.entries(data.metrics).map(([key, value]) => (
                <div key={key} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <dt className="text-slate-600">{key}</dt>
                  <dd className="font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Última interação corrigida</h2>
            {!data.lastDiagnostic ? (
              <p className="mt-2 text-sm text-slate-500">Nenhuma interação registrada nesta sessão.</p>
            ) : (
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>
                  <span className="font-medium">Mensagem:</span> {data.lastDiagnostic.userMessage}
                </p>
                <p>
                  <span className="font-medium">Intent:</span> {data.lastDiagnostic.selectedIntent}
                </p>
                <p>
                  <span className="font-medium">Tools:</span>{" "}
                  {data.lastDiagnostic.selectedTools.join(", ") || "—"}
                </p>
                <p>
                  <span className="font-medium">Tópico:</span>{" "}
                  {data.lastDiagnostic.context.currentTopic}
                  {data.lastDiagnostic.context.topicLocked ? " (locked)" : ""}
                </p>
                <p>
                  <span className="font-medium">Critic score:</span>{" "}
                  {data.lastDiagnostic.critique.score.toFixed(2)} —{" "}
                  {data.lastDiagnostic.critique.approved ? "aprovado" : "reprovado"}
                </p>
                {data.lastDiagnostic.critique.issues.length > 0 ? (
                  <p>
                    <span className="font-medium">Motivos:</span>{" "}
                    {data.lastDiagnostic.critique.issues.join(", ")}
                  </p>
                ) : null}
                <p>
                  <span className="font-medium">Regenerado:</span>{" "}
                  {data.lastDiagnostic.regenerated ? "sim" : "não"}
                </p>
                <p>
                  <span className="font-medium">Humanização:</span>{" "}
                  {data.lastDiagnostic.humanizationApplied ? "aplicada" : "não necessária"}
                </p>
                <p className="rounded-lg bg-slate-50 p-3 text-slate-600">
                  {data.lastDiagnostic.finalAnswerPreview}
                </p>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
