"use client";

import type { UserRuleItem } from "@/types/rules";
import { Cpu, Loader2, Sliders, Trash2 } from "lucide-react";

interface ManualRulesListProps {
  rules: UserRuleItem[];
  deletingId: string | null;
  onDelete: (ruleId: string) => void;
}

export function ManualRulesList({ rules, deletingId, onDelete }: ManualRulesListProps) {
  if (rules.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
        <Sliders className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-700">Nenhuma regra manual ainda</p>
        <p className="mt-1 text-xs text-slate-500">
          Crie regras rígidas para automatizar categorização e métodos de pagamento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <article
          key={rule.id}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-900">{rule.name}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  Prioridade {rule.priority}
                </span>
                {!rule.isActive && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    Inativa
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
                  <Cpu className="h-3 w-3" />
                  {rule.conditionLabel}
                </span>
                <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-100">
                  {rule.actionLabel}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDelete(rule.id)}
              disabled={deletingId === rule.id}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
              title="Excluir regra"
              aria-label={`Excluir regra ${rule.name}`}
            >
              {deletingId === rule.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
