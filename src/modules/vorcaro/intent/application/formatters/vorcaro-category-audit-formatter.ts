import type {
  CategoryAuditFinding,
  CategoryAuditFindingType,
  CategoryAuditReport,
} from "@/modules/categories/domain/types/category-audit";

const MAX_PRIORITY_TOPICS = 5;
const MAX_SUPPLIER_EXAMPLES = 5;

const TYPE_PRIORITY: Record<CategoryAuditFindingType, number> = {
  SUPPLIER_AS_CATEGORY: 100,
  DUPLICATE_CATEGORY: 90,
  DUPLICATE_SUBCATEGORY: 85,
  OVERLAPPING_CATEGORY: 80,
  MERGE_SUGGESTION: 75,
  INCONSISTENT_NAMING: 60,
  LOW_USAGE_CATEGORY: 40,
};

export type CategoryAuditFormattedTopic = {
  message: string;
  examples?: string[];
  priority: number;
};

export type CategoryAuditFormattedResponse = {
  opening: string;
  priorities: CategoryAuditFormattedTopic[];
  context: string;
  closing: string;
  ctaTitle: string;
  ctaDescription: string;
  executiveSummary: string;
};

function shortName(path: string): string {
  const parts = path.split("→").map((p) => p.trim());
  return parts[parts.length - 1] ?? path;
}

function uniqueShortNames(paths: string[], limit = 6): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const path of paths) {
    const name = shortName(path);
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
    if (result.length >= limit) break;
  }
  return result;
}

function buildOpening(report: CategoryAuditReport, question?: string): string {
  const hasIssues = report.findings.length > 0;
  const q = (question ?? "").toLowerCase();

  if (!hasIssues) {
    return "Analisei suas categorias e, no geral, a estrutura está bem organizada.";
  }

  if (/est[aã]o boas|est[aã]o ok|est[aã]o certas/i.test(q)) {
    return "Sua estrutura geral está boa — mas encontrei alguns ajustes que podem deixar seus relatórios mais consistentes.";
  }

  if (/melhorar|melhoraria|duplic|redund/i.test(q)) {
    return "Analisei suas categorias e há algumas oportunidades simples de deixar a organização mais clara.";
  }

  return "Analisei suas categorias e encontrei alguns ajustes que podem deixar seus relatórios mais consistentes.";
}

function buildSupplierTopic(report: CategoryAuditReport): CategoryAuditFormattedTopic | null {
  if (report.supplierLikeCategories.length === 0) return null;

  const examples = uniqueShortNames(report.supplierLikeCategories, MAX_SUPPLIER_EXAMPLES);

  return {
    priority: TYPE_PRIORITY.SUPPLIER_AS_CATEGORY,
    message:
      "Percebi que alguns nomes representam empresas ou canais de compra, e não categorias financeiras. Isso pode dificultar análises futuras porque gastos parecidos acabam ficando separados.",
    examples,
  };
}

function buildDuplicateTopic(findings: CategoryAuditFinding[]): CategoryAuditFormattedTopic | null {
  const related = findings.filter((f) =>
    ["DUPLICATE_CATEGORY", "DUPLICATE_SUBCATEGORY", "MERGE_SUGGESTION", "INCONSISTENT_NAMING"].includes(
      f.type,
    ),
  );
  if (related.length === 0) return null;

  const examples = uniqueShortNames(
    related.flatMap((f) => f.currentItems),
    6,
  );

  return {
    priority: TYPE_PRIORITY.DUPLICATE_SUBCATEGORY,
    message:
      "Existem categorias com nomes muito parecidos que provavelmente representam a mesma coisa.",
    examples: examples.length > 0 ? examples : undefined,
  };
}

function buildOverlappingTopic(findings: CategoryAuditFinding[]): CategoryAuditFormattedTopic | null {
  const related = findings.filter((f) => f.type === "OVERLAPPING_CATEGORY");
  if (related.length === 0) return null;

  const examples = uniqueShortNames(
    related.flatMap((f) => f.currentItems.map(shortName)),
    6,
  );

  const exampleHint =
    examples.length >= 2
      ? `, como ${examples.slice(0, 3).join(" e ")}`
      : examples.length === 1
        ? `, como ${examples[0]}`
        : "";

  return {
    priority: TYPE_PRIORITY.OVERLAPPING_CATEGORY,
    message: `Há categorias repetidas em grupos diferentes${exampleHint}.`,
    examples: examples.length > 0 ? examples : undefined,
  };
}

function buildLowUsageTopic(report: CategoryAuditReport): CategoryAuditFormattedTopic | null {
  if (report.lowUsageCategories.length === 0) return null;

  return {
    priority: TYPE_PRIORITY.LOW_USAGE_CATEGORY,
    message:
      "Algumas categorias ainda não aparecem em lançamentos — vale revisar se ainda fazem sentido manter.",
    examples: uniqueShortNames(report.lowUsageCategories, 4),
  };
}

function buildConsultivePlan(): CategoryAuditFormattedTopic[] {
  return [
    {
      priority: 95,
      message: "Categorias duplicadas ou muito parecidas.",
    },
    {
      priority: 94,
      message: "Empresas cadastradas como categoria.",
    },
    {
      priority: 93,
      message: "Categorias financeiras repetidas em grupos diferentes.",
    },
  ];
}

export class VorcaroCategoryAuditFormatter {
  format(report: CategoryAuditReport, question?: string): CategoryAuditFormattedResponse {
    const opening = buildOpening(report, question);

    const topics: CategoryAuditFormattedTopic[] = [];
    const supplier = buildSupplierTopic(report);
    const duplicate = buildDuplicateTopic(report.findings);
    const overlapping = buildOverlappingTopic(report.findings);
    const lowUsage = buildLowUsageTopic(report);

    if (supplier) topics.push(supplier);
    if (duplicate) topics.push(duplicate);
    if (overlapping) topics.push(overlapping);
    if (lowUsage) topics.push(lowUsage);

    let priorities =
      topics.length > 0
        ? topics.sort((a, b) => b.priority - a.priority).slice(0, MAX_PRIORITY_TOPICS)
        : buildConsultivePlan();

    const hasRealIssues = report.findings.length > 0;

    const context = hasRealIssues
      ? "Esses ajustes não impedem o uso do sistema, mas podem melhorar bastante a qualidade das análises e automações futuras."
      : "Com o tempo, pequenos desvios podem aparecer — vale revisar a taxonomia de vez em quando, principalmente após criar novas regras.";

    const closing =
      "Nada será alterado automaticamente. Qualquer fusão, renomeação ou remoção passa pela sua confirmação.";

    const executiveSummary = this.formatExecutiveSummary(report);

    const ctaDescription = hasRealIssues
      ? "Posso mostrar uma proposta de reorganização das categorias antes de qualquer alteração. Deseja ver?"
      : "Posso detalhar como manter suas categorias organizadas ao longo do tempo. Deseja analisar?";

    return {
      opening,
      priorities,
      context,
      closing,
      ctaTitle: "Reorganização de categorias",
      ctaDescription,
      executiveSummary,
    };
  }

  formatExecutiveSummary(report: CategoryAuditReport): string {
    if (report.findings.length === 0) {
      return "Sua taxonomia está bem estruturada. Não identifiquei ajustes urgentes — continue revisando periodicamente após novos lançamentos e regras.";
    }

    const themes: string[] = [];
    if (report.supplierLikeCategories.length > 0) {
      themes.push("empresas cadastradas como categoria");
    }
    if (
      report.findings.some((f) =>
        ["DUPLICATE_CATEGORY", "DUPLICATE_SUBCATEGORY", "MERGE_SUGGESTION"].includes(f.type),
      )
    ) {
      themes.push("categorias duplicadas ou muito parecidas");
    }
    if (report.findings.some((f) => f.type === "OVERLAPPING_CATEGORY")) {
      themes.push("categorias repetidas em grupos diferentes");
    }
    if (report.findings.some((f) => f.type === "INCONSISTENT_NAMING")) {
      themes.push("nomes inconsistentes");
    }
    if (report.lowUsageCategories.length > 0) {
      themes.push("categorias pouco utilizadas");
    }

    const themeText =
      themes.length > 0
        ? themes.slice(0, 3).join(", ")
        : "oportunidades de simplificação";

    return [
      "Sua taxonomia tem uma base sólida.",
      "Encontrei algumas oportunidades de simplificação que podem melhorar a qualidade das análises e automações futuras.",
      `Os principais pontos estão relacionados a ${themeText}.`,
    ].join(" ");
  }

  formatChatMessage(report: CategoryAuditReport, question?: string): string {
    const formatted = this.format(report, question);
    const lines: string[] = [formatted.opening, ""];

    if (report.findings.length > 0) {
      lines.push("Os principais são:", "");
      for (const topic of formatted.priorities) {
        lines.push(`• ${topic.message}`);
        if (topic.examples && topic.examples.length > 0) {
          for (const example of topic.examples) {
            lines.push(`  ◦ ${example}`);
          }
        }
      }
      lines.push("");
    } else if (/melhorar|melhoraria|duplic/i.test(question ?? "")) {
      lines.push("Eu começaria por três frentes:", "");
      for (const topic of formatted.priorities) {
        lines.push(`• ${topic.message}`);
      }
      lines.push("");
      lines.push(
        "Isso já deixaria sua taxonomia muito mais limpa sem exigir grandes mudanças.",
        "",
      );
    }

    lines.push(formatted.context, "", formatted.closing);
    return lines.join("\n").trim();
  }

  formatPriorityBullets(report: CategoryAuditReport, question?: string): string[] {
    const formatted = this.format(report, question);
    return formatted.priorities.map((topic) => {
      if (!topic.examples || topic.examples.length === 0) {
        return topic.message;
      }
      return `${topic.message} Exemplos: ${topic.examples.join(", ")}.`;
    });
  }
}
