"use client";

import type { UserRuleItem } from "@/types/rules";
import { isSystemDefaultRuleDescription } from "@/lib/rules/default-categorization-rules";
import { Cpu, Loader2, Shield, Sliders, Trash2, User } from "lucide-react";

interface ManualRulesListProps {
  rules: UserRuleItem[];
  deletingId: string | null;
  onDelete: (ruleId: string) => void;
}

function RuleCard({
  rule,
  deletingId,
  onDelete,
  variant,
}: {
  rule: UserRuleItem;
  deletingId: string | null;
  onDelete: (ruleId: string) => void;
  variant: "user" | "system";
}) {
  const isSystem = variant === "system";

  return (
    <article
      className={
        isSystem
          ? "rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm transition hover:border-emerald-300"
          : "rounded-xl border border-blue-200 bg-white p-4 shadow-sm transition hover:border-blue-300"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900">{rule.name}</h3>
            {isSystem ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-200">
                <Shield className="h-3 w-3" />
                Sistema
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800 ring-1 ring-blue-200">
                <User className="h-3 w-3" />
                Sua regra
              </span>
            )}
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
            <span
              className={
                isSystem
                  ? "inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200"
                  : "inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100"
              }
            >
              <Cpu className="h-3 w-3" />
              {rule.conditionLabel}
            </span>
            <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-100">
              {rule.actionLabel}
            </span>
          </div>
        </div>

        {!isSystem && (
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
        )}
      </div>
    </article>
  );
}

function RulesSection({
  title,
  description,
  icon: Icon,
  tone,
  rules,
  deletingId,
  onDelete,
  variant,
  emptyMessage,
}: {
  title: string;
  description: string;
  icon: typeof User;
  tone: "blue" | "emerald";
  rules: UserRuleItem[];
  deletingId: string | null;
  onDelete: (ruleId: string) => void;
  variant: "user" | "system";
  emptyMessage: string;
}) {
  const headerTone =
    tone === "blue"
      ? "border-blue-200 bg-blue-50/60 text-blue-900"
      : "border-emerald-200 bg-emerald-50/60 text-emerald-900";

  return (
    <section className="space-y-3">
      <div className={`rounded-lg border px-4 py-3 ${headerTone}`}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" />
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-xs opacity-80">{description}</p>
          </div>
          <span className="ml-auto rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium">
            {rules.length}
          </span>
        </div>
      </div>

      {rules.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center text-xs text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              deletingId={deletingId}
              onDelete={onDelete}
              variant={variant}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function ManualRulesList({ rules, deletingId, onDelete }: ManualRulesListProps) {
  const userRules = rules.filter((r) => !isSystemDefaultRuleDescription(r.description));
  const systemRules = rules.filter((r) => isSystemDefaultRuleDescription(r.description));

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
    <div className="space-y-8">
      <RulesSection
        title="Suas regras"
        description="Prioridade máxima na classificação — você controla e pode excluir."
        icon={User}
        tone="blue"
        rules={userRules}
        deletingId={deletingId}
        onDelete={onDelete}
        variant="user"
        emptyMessage="Nenhuma regra personalizada. Use “Nova Regra” para criar."
      />

      <RulesSection
        title="Regras do sistema"
        description="Pré-definidas pelo Vorcaro (prioridade 50). Protegidas contra exclusão acidental."
        icon={Shield}
        tone="emerald"
        rules={systemRules}
        deletingId={deletingId}
        onDelete={onDelete}
        variant="system"
        emptyMessage="Nenhuma regra de sistema instalada. Execute npm run seed:rules para popular."
      />
    </div>
  );
}
