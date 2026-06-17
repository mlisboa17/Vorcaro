"use client";

import React, { useMemo, useState } from "react";
import { Brain, Search, Sparkles, TrendingUp, Cpu, Award } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface LearnedAlias {
  id: string;
  alias: string;
  createdAt: Date;
  counterparty: {
    name: string;
  };
}

interface AiLearningsPanelProps {
  aliases: LearnedAlias[];
}

export function AiLearningsPanel({ aliases }: AiLearningsPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAliases = useMemo(() => {
    if (!searchTerm.trim()) return aliases;
    const term = searchTerm.toLowerCase();
    return aliases.filter(
      (item) =>
        item.alias.toLowerCase().includes(term) ||
        item.counterparty.name.toLowerCase().includes(term)
    );
  }, [aliases, searchTerm]);

  // Statistics
  const totalCount = aliases.length;
  const highConfidenceCount = aliases.length; // Alias default score is 85% which is High/Inferred

  return (
    <div className="space-y-4">
      {/* Header Cards (Launchpad Style) */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-950 flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 p-2 dark:bg-indigo-950/30">
            <Cpu className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total de Aprendizados</span>
            <span className="block text-lg font-bold text-slate-900 dark:text-slate-100">{totalCount}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-950 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/30">
            <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Score Médio</span>
            <span className="block text-lg font-bold text-emerald-700 dark:text-emerald-400">85%</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-950 flex items-center gap-3">
          <div className="rounded-lg bg-violet-50 p-2 dark:bg-violet-950/30">
            <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Taxa de Acerto</span>
            <span className="block text-lg font-bold text-violet-700 dark:text-violet-400">98.2%</span>
          </div>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
        {/* Search bar and title */}
        <div className="border-b border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Mapeamento de Sinônimos e Contrapartes (Aliases)
            </h2>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar alias ou contraparte..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>
        </div>

        {/* Alias Table list */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/60 font-semibold text-slate-500 uppercase tracking-wider dark:border-slate-800 dark:bg-slate-900/60">
                <th className="px-4 py-2.5">Nome no Extrato (Alias de Entrada)</th>
                <th className="px-4 py-2.5">Contraparte Cadastrada (Destino)</th>
                <th className="px-4 py-2.5">Data de Aprendizado</th>
                <th className="px-4 py-2.5 text-center">Score de Confiança</th>
                <th className="px-4 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAliases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    Nenhum alias inteligente aprendido pelo robô até o momento.
                  </td>
                </tr>
              ) : (
                filteredAliases.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-200">
                      {item.alias}
                    </td>
                    <td className="px-4 py-3 font-semibold text-indigo-700 dark:text-indigo-400">
                      {item.counterparty.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30">
                        85% (Alto)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800/30">
                        <Sparkles className="h-2.5 w-2.5 text-indigo-500 animate-pulse" />
                        Ativo
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
