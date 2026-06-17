"use client";

import { useState, useTransition } from "react";
import { Sparkles, Check, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { applyBulkSuggestion, rejectSuggestion } from "@/modules/ai/actions/suggestion-actions";

export type AILearningPatternPreview = {
  id: string;
  normalizedDescription: string;
  originalExample: string;
  suggestedCategoryName: string;
  isNewCategory: boolean;
  occurrences: number;
};

export function AILearningsPanel({ initialPatterns }: { initialPatterns: AILearningPatternPreview[] }) {
  const [patterns, setPatterns] = useState(initialPatterns);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleApprove = (id: string) => {
    if (isPending) return;
    setBusyId(id);
    setErrorMsg(null);
    
    // Optimistic Update
    const removedPattern = patterns.find(p => p.id === id);
    setPatterns(prev => prev.filter(p => p.id !== id));

    startTransition(async () => {
      const result = await applyBulkSuggestion(id);
      if (!result.success) {
        setErrorMsg(result.error ?? "Erro ao aplicar sugestão em lote.");
        // Rollback
        if (removedPattern) {
          setPatterns(prev => [removedPattern, ...prev]);
        }
      }
      setBusyId(null);
    });
  };

  const handleReject = (id: string) => {
    if (isPending) return;
    setBusyId(id);
    setErrorMsg(null);

    // Optimistic Update
    const removedPattern = patterns.find(p => p.id === id);
    setPatterns(prev => prev.filter(p => p.id !== id));

    startTransition(async () => {
      const result = await rejectSuggestion(id);
      if (!result.success) {
        setErrorMsg(result.error ?? "Erro ao rejeitar sugestão.");
        // Rollback
        if (removedPattern) {
          setPatterns(prev => [removedPattern, ...prev]);
        }
      }
      setBusyId(null);
    });
  };

  if (initialPatterns.length === 0 && patterns.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <Sparkles className="mx-auto h-12 w-12 text-slate-400 bg-slate-50 p-2.5 rounded-full dark:bg-slate-900/50 dark:text-slate-500" />
        <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
          Nenhum Insight de IA Disponível
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Continue utilizando o sistema. O nosso motor aprenderá com seus padrões recorrentes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/30 dark:bg-red-950/10 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {patterns.map((pattern) => (
          <div 
            key={pattern.id}
            className="flex flex-col rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 shadow-sm transition-all hover:bg-indigo-50/60 dark:border-indigo-900/30 dark:bg-indigo-950/10 dark:hover:bg-indigo-950/20"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                <Sparkles className="h-4 w-4 shrink-0" />
                <h4 className="font-bold text-sm">Padrão Recorrente</h4>
              </div>
              <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
                {pattern.occurrences} OCORRÊNCIAS
              </span>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed flex-grow">
              Identificamos <strong className="font-semibold">{pattern.occurrences} lançamentos semelhantes</strong> (ex: "{pattern.originalExample}") sem subcategoria. 
              Sugestão: Classificar como <strong className="font-semibold text-indigo-600 dark:text-indigo-400">{pattern.suggestedCategoryName}</strong>
              {pattern.isNewCategory && " (Nova Categoria)"}.
            </p>

            <div className="flex flex-col gap-2 mt-auto">
              <button
                type="button"
                disabled={isPending || busyId === pattern.id}
                onClick={() => handleApprove(pattern.id)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all focus:ring-2 focus:ring-indigo-500"
              >
                {busyId === pattern.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Aplicar em Lote ({pattern.occurrences})
              </button>
              
              <button
                type="button"
                disabled={isPending || busyId === pattern.id}
                onClick={() => handleReject(pattern.id)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:focus:ring-slate-800"
              >
                {busyId === pattern.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                Ignorar Definitivamente
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
