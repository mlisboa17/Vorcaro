"use client";

import type { LearningPatternItem } from "@/types/rules";
import { ArrowRight, Brain, Loader2, Sparkles, Trash2 } from "lucide-react";

interface LearningPatternsListProps {
  patterns: LearningPatternItem[];
  forgettingId: string | null;
  onForget: (patternId: string, keyword: string) => void;
}

export function LearningPatternsList({
  patterns,
  forgettingId,
  onForget,
}: LearningPatternsListProps) {
  if (patterns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/30 px-6 py-10 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-violet-300" />
        <p className="mt-3 text-sm font-medium text-slate-700">Memória ainda vazia</p>
        <p className="mt-1 text-xs text-slate-500">
          Ao confirmar lançamentos, o Logos aprende palavras-chave e preferências automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {patterns.map((pattern) => (
        <article
          key={pattern.id}
          className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                  <Sparkles className="h-3 w-3" />
                  IA
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {pattern.patternTypeLabel}
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  Confiança {(pattern.confidence * 100).toFixed(0)}%
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-medium text-white">
                  {pattern.keyword}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
                <span className="font-semibold text-slate-800">{pattern.targetLabel}</span>
              </div>

              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Brain className="h-3.5 w-3.5" />
                Usado {pattern.occurrences} {pattern.occurrences === 1 ? "vez" : "vezes"}
                <span className="text-slate-300">·</span>
                Último uso{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  day: "2-digit",
                  month: "short",
                }).format(new Date(pattern.lastSeenAt))}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onForget(pattern.id, pattern.keyword)}
              disabled={forgettingId === pattern.id}
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
              title="Esquecer aprendizado"
            >
              {forgettingId === pattern.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Trash2 className="h-3.5 w-3.5" />
                  Esquecer
                </span>
              )}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
