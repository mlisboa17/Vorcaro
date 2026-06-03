"use client";

import Link from "next/link";
import { Target } from "lucide-react";
import type { ExecutiveDashboardDTO } from "@/types/executive-dashboard";

type Props = {
  planning: ExecutiveDashboardDTO["planning"] | undefined;
};

export function ExecutivePlanningCard({ planning }: Props) {
  if (!planning) return null;

  const { metaMaisProxima, metaMaisAtrasada, metaMaiorValor, percentualProgressoGlobal } = planning;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Target className="h-4 w-4 text-emerald-600" />
          Planejamento Financeiro
        </h2>
        <Link href="/dashboard/planning" className="text-xs font-medium text-emerald-600 hover:underline">
          Ver metas
        </Link>
      </div>
      <p className="text-2xl font-bold text-slate-900">{planning.metasAtivas}</p>
      <p className="text-xs text-slate-500">metas ativas · progresso {percentualProgressoGlobal}%</p>
      <div className="mt-4 space-y-2 text-sm text-slate-600">
        {metaMaisProxima ? (
          <p>
            <span className="font-medium text-slate-800">Mais próxima:</span> {metaMaisProxima.nome} (
            {metaMaisProxima.estrategia.percentualConcluido}%)
          </p>
        ) : (
          <p className="text-slate-400">Nenhuma meta em andamento.</p>
        )}
        {metaMaiorValor && (
          <p>
            <span className="font-medium text-slate-800">Maior valor:</span> {metaMaiorValor.nome}
          </p>
        )}
        {metaMaisAtrasada && (
          <p className="text-rose-600">
            <span className="font-medium">Atrasada:</span> {metaMaisAtrasada.nome}
          </p>
        )}
      </div>
    </section>
  );
}
