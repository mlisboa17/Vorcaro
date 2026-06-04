"use client";

import type { RulesListResponse, RulesTab } from "@/types/rules";
import { RULES_TABS } from "@/types/rules";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, Shield, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { partitionRulesByOrigin } from "@/lib/rules/rule-priorities";
import { CreateRuleModal } from "./create-rule-modal";
import { LearningPatternsList } from "./learning-patterns-list";
import { ManualRulesList } from "./manual-rules-list";

const TAB_ICONS = {
  user: User,
  system: Shield,
  memory: Sparkles,
} as const;

export function RulesDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as RulesTab | null) ?? "user";

  const [data, setData] = useState<RulesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [forgettingPatternId, setForgettingPatternId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    const response = await fetch("/api/rules", { credentials: "include" });

    if (response.status === 401) {
      setAuthError(true);
      return;
    }

    if (!response.ok) {
      throw new Error("Falha ao carregar regras e padrões");
    }

    const payload = (await response.json()) as RulesListResponse;
    setData(payload);
    setAuthError(false);
  }, []);

  useEffect(() => {
    fetchRules()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fetchRules]);

  function handleTabChange(tab: RulesTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/dashboard/rules?${params.toString()}`);
  }

  async function handleDeleteRule(ruleId: string) {
    const confirmed = window.confirm("Excluir esta regra? Essa ação não pode ser desfeita.");
    if (!confirmed) {
      return;
    }

    setDeletingRuleId(ruleId);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Falha ao excluir regra");
      }

      setActionMessage("Regra excluída com sucesso.");
      await fetchRules();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setDeletingRuleId(null);
    }
  }

  async function handleForgetPattern(patternId: string, keyword: string) {
    const confirmed = window.confirm(
      `Esquecer todo o aprendizado associado a "${keyword}"?\n\nO Logos voltará a inferir do zero para essa palavra-chave.`,
    );

    if (!confirmed) {
      return;
    }

    setForgettingPatternId(patternId);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/learning-patterns/${patternId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Falha ao limpar padrão aprendido");
      }

      const result = (await response.json()) as { deletedCount: number; keyword: string };
      setActionMessage(
        `Aprendizado de "${result.keyword}" removido (${result.deletedCount} registro(s)).`,
      );
      await fetchRules();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setForgettingPatternId(null);
    }
  }

  const { userRules, systemRules } = partitionRulesByOrigin(data?.rules ?? []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-amber-900">Autenticação necessária</h2>
        <p className="mt-2 text-sm text-amber-800">
          Faça login com <code className="rounded bg-amber-100 px-1">dev@logos.local</code> para
          gerenciar automações.
        </p>
        <a
          href="/api/auth/signin"
          className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Entrar
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Regras e Automações
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Suas regras vencem o aprendizado da IA. Regras de sistema e memória complementam a
            classificação.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {activeTab === "user" && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              Nova Regra
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <User className="h-4 w-4" />
            <span className="text-sm font-semibold">Regras do usuário</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-900">{userRules.length}</p>
          <p className="text-xs text-blue-700/80">Prioridade 100 · vence aprendizado</p>
        </article>

        <article className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-2 text-emerald-800">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-semibold">Regras do sistema</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{systemRules.length}</p>
          <p className="text-xs text-emerald-700/80">Prioridade 50 · pré-definidas</p>
        </article>

        <article className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
          <div className="flex items-center gap-2 text-violet-800">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold">Padrões aprendidos</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-violet-900">{data?.patterns.length ?? 0}</p>
          <p className="text-xs text-violet-700/80">Memória adaptativa · ref. prioridade 10</p>
        </article>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {RULES_TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.value];
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTabChange(tab.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                activeTab === tab.value
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {actionMessage && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {actionMessage}
        </div>
      )}

      {activeTab === "user" && (
        <ManualRulesList
          rules={userRules}
          deletingId={deletingRuleId}
          onDelete={handleDeleteRule}
          variant="user"
        />
      )}

      {activeTab === "system" && (
        <ManualRulesList
          rules={systemRules}
          deletingId={deletingRuleId}
          onDelete={handleDeleteRule}
          variant="system"
        />
      )}

      {activeTab === "memory" && (
        <LearningPatternsList
          patterns={data?.patterns ?? []}
          forgettingId={forgettingPatternId}
          onForget={handleForgetPattern}
        />
      )}

      <CreateRuleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          fetchRules().catch(console.error);
          setActionMessage("Regra criada com sucesso.");
        }}
      />
    </div>
  );
}
