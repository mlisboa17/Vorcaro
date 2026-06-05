"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Search } from "lucide-react";
import type {
  CategoryAuditFinding,
  CategoryAuditImprovement,
  CategoryAuditReport,
} from "@/modules/categories/domain/types/category-audit";
import { SettingsToastProvider, useSettingsToast } from "@/components/settings/settings-toast";
import { cn } from "@/lib/utils/cn";

const PRIORITY_STYLES: Record<CategoryAuditImprovement["priority"], string> = {
  high: "border-rose-300 bg-rose-50 text-rose-900",
  medium: "border-amber-200 bg-amber-50 text-amber-900",
  low: "border-slate-200 bg-slate-50 text-slate-700",
};

const PRIORITY_LABEL: Record<CategoryAuditImprovement["priority"], string> = {
  high: "Alta prioridade",
  medium: "Média prioridade",
  low: "Baixa prioridade",
};

const HEALTH_SCORE_COLOR: Record<CategoryAuditReport["healthScore"]["label"], string> = {
  Excelente: "text-emerald-700",
  Boa: "text-emerald-600",
  Regular: "text-amber-700",
  "Precisa atenção": "text-rose-700",
};

function CategoryAuditDashboardInner() {
  const { pushToast } = useSettingsToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<CategoryAuditReport | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<CategoryAuditImprovement["priority"] | "ALL">(
    "ALL",
  );
  const [search, setSearch] = useState("");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories/audit");
      if (!res.ok) {
        throw new Error("Falha ao carregar auditoria");
      }
      const data = (await res.json()) as CategoryAuditReport;
      setReport(data);
    } catch {
      pushToast("error", "Não foi possível carregar a auditoria de categorias.");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredImprovements =
    report?.topImprovements.filter((item) => {
      if (priorityFilter !== "ALL" && item.priority !== priorityFilter) return false;
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return (
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.impactLabel.toLowerCase().includes(term) ||
        item.items.some((i) => i.toLowerCase().includes(term))
      );
    }) ?? [];

  const filteredFindings =
    report?.findings.filter((f) => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return (
        f.title.toLowerCase().includes(term) ||
        f.description.toLowerCase().includes(term) ||
        f.currentItems.some((i) => i.toLowerCase().includes(term))
      );
    }) ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/settings?tab=categorias"
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar às categorias
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">Auditoria de categorias</h1>
          <p className="mt-1 text-sm text-slate-500">
            Visão consultiva do Vorcaro — sugestões priorizadas, sem alterações automáticas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          Atualizar
        </button>
      </header>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : report ? (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Health Score
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <span className="text-4xl font-semibold text-slate-900">
                {report.healthScore.score}
                <span className="text-lg font-normal text-slate-500">/100</span>
              </span>
              <span
                className={cn(
                  "rounded-full bg-slate-100 px-3 py-1 text-sm font-medium",
                  HEALTH_SCORE_COLOR[report.healthScore.label],
                )}
              >
                {report.healthScore.label}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Quanto maior a nota, mais consistente está a organização das suas categorias para
              relatórios e automações.
            </p>
          </section>

          <section className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-emerald-900">Top 5 melhorias</h2>
            <p className="mt-1 text-xs text-emerald-800">
              Ordenadas por impacto, uso e confiança — o que mais vale atacar primeiro.
            </p>
            {report.topImprovements.length === 0 ? (
              <p className="mt-3 text-sm text-emerald-950">
                Nenhum ajuste prioritário identificado. Sua taxonomia está em bom estado.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {report.topImprovements.map((item) => (
                  <ImprovementCard key={item.id} item={item} />
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar melhorias..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value as CategoryAuditImprovement["priority"] | "ALL")
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="ALL">Todas prioridades</option>
              <option value="high">Alta prioridade</option>
              <option value="medium">Média prioridade</option>
              <option value="low">Baixa prioridade</option>
            </select>
          </div>

          {filteredImprovements.length > 0 && search.trim() ? (
            <ul className="space-y-3">
              {filteredImprovements.map((item) => (
                <ImprovementCard key={`filter-${item.id}`} item={item} />
              ))}
            </ul>
          ) : null}

          <button
            type="button"
            onClick={() => setShowTechnicalDetails((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            {showTechnicalDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {showTechnicalDetails ? "Ocultar detalhes técnicos" : "Ver detalhes técnicos (debug)"}
          </button>

          {showTechnicalDetails ? (
            <TechnicalDetailsSection findings={filteredFindings} report={report} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function ImprovementCard({ item }: { item: CategoryAuditImprovement }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-medium text-slate-900">{item.title}</h3>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-medium",
            PRIORITY_STYLES[item.priority],
          )}
        >
          {PRIORITY_LABEL[item.priority]}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{item.description}</p>
      <p className="mt-2 text-sm">
        <span className="font-medium text-slate-700">Impacto esperado: </span>
        {item.impactLabel}
      </p>
      {item.items.length > 0 ? (
        <p className="mt-2 text-sm text-slate-500">
          <span className="font-medium text-slate-600">Itens: </span>
          {item.items.slice(0, 6).join(", ")}
          {item.items.length > 6 ? "…" : ""}
        </p>
      ) : null}
    </li>
  );
}

function TechnicalDetailsSection({
  findings,
  report,
}: {
  findings: CategoryAuditFinding[];
  report: CategoryAuditReport;
}) {
  const TYPE_LABELS: Record<CategoryAuditFinding["type"], string> = {
    DUPLICATE_CATEGORY: "DUPLICATE_CATEGORY",
    DUPLICATE_SUBCATEGORY: "DUPLICATE_SUBCATEGORY",
    SUPPLIER_AS_CATEGORY: "SUPPLIER_AS_CATEGORY",
    OVERLAPPING_CATEGORY: "OVERLAPPING_CATEGORY",
    INCONSISTENT_NAMING: "INCONSISTENT_NAMING",
    LOW_USAGE_CATEGORY: "LOW_USAGE_CATEGORY",
    MERGE_SUGGESTION: "MERGE_SUGGESTION",
  };

  return (
    <section className="space-y-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <p className="text-xs text-slate-500">
        Área de debug — códigos internos visíveis apenas aqui.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total de achados" value={report.summary.totalFindings} />
        <SummaryCard label="Alta severidade" value={report.summary.high} />
        <SummaryCard label="Média severidade" value={report.summary.medium} />
        <SummaryCard label="Baixa severidade" value={report.summary.low} />
      </div>
      {findings.length === 0 ? (
        <p className="text-sm text-slate-600">Nenhum achado técnico registrado.</p>
      ) : (
        <ul className="space-y-2">
          {findings.map((finding) => (
            <li
              key={`${finding.type}-${finding.title}-${finding.currentItems.join("|")}`}
              className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
            >
              <span className="font-mono text-xs text-slate-500">{TYPE_LABELS[finding.type]}</span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="text-slate-700">{finding.title}</span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="text-slate-500">severity {finding.severity}</span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="text-slate-500">
                confidence {Math.round(finding.confidence * 100)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function CategoryAuditDashboard() {
  return (
    <SettingsToastProvider>
      <CategoryAuditDashboardInner />
    </SettingsToastProvider>
  );
}
