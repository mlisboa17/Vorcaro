import type {
  CategoryAuditFindingType,
  CategoryAuditReport,
} from "@/modules/categories/domain/types/category-audit";
import { categoryAuditPreferenceMemory } from "./category-audit-preference-memory.service";

export const CONSULTATIVE_MODES = ["ANALYTICAL", "CONSULTATIVE", "EXECUTIVE"] as const;
export type ConsultativeMode = (typeof CONSULTATIVE_MODES)[number];

export type ConsultativeRecommendation = {
  whatIFound: string;
  whyItMatters: string;
  whatIWouldDo: string;
  priority: "high" | "medium" | "low";
};

export type ConsultativeResponse = {
  message: string;
  recommendations: ConsultativeRecommendation[];
  structuredProposal: string | null;
  ctaDescription: string;
  includeDashboardAction: boolean;
  healthScoreLine: string;
};

const TECHNICAL_PATTERN =
  /\b(DUPLICATE_CATEGORY|DUPLICATE_SUBCATEGORY|SUPPLIER_AS_CATEGORY|OVERLAPPING_CATEGORY|INCONSISTENT_NAMING|LOW_USAGE_CATEGORY|MERGE_SUGGESTION|severity|confidence)\b|confian[cç]a\s*\d+%/i;

const CONSULTATIVE_COPY: Record<
  CategoryAuditFindingType,
  { found: string; why: string; action: string }
> = {
  SUPPLIER_AS_CATEGORY: {
    found:
      "Percebi que alguns nomes representam empresas ou aplicativos, e não tipos de gasto.",
    why: "Isso pode dificultar análises futuras porque o mesmo tipo de gasto acaba espalhado em vários lugares.",
    action:
      "Eu manteria categorias amplas como Alimentação e Transporte e deixaria marcas como Uber e iFood apenas como regras automáticas de classificação.",
  },
  DUPLICATE_CATEGORY: {
    found:
      "Existem categorias muito parecidas que podem estar dividindo informações que deveriam ficar agrupadas.",
    why: "Relatórios e metas ficam menos claros quando o mesmo conceito aparece com nomes diferentes.",
    action: "Consolidaria os pares mais parecidos, começando pelos que você mais usa nos lançamentos.",
  },
  DUPLICATE_SUBCATEGORY: {
    found:
      "Existem categorias muito parecidas que podem estar dividindo informações que deveriam ficar agrupadas.",
    why: "Isso fragmenta seus relatórios e dificulta comparar gastos ao longo do tempo.",
    action: "Escolheria um único nome dentro de cada grupo e migraria os lançamentos aos poucos.",
  },
  OVERLAPPING_CATEGORY: {
    found: "Há conceitos repetidos em grupos diferentes da sua taxonomia.",
    why: "Totais e tendências ficam distorcidos quando o mesmo tipo de gasto aparece em ramos distintos.",
    action: "Centralizaria cada conceito em um único lugar na árvore de categorias.",
  },
  INCONSISTENT_NAMING: {
    found: "Alguns nomes não seguem o mesmo padrão das demais categorias do grupo.",
    why: "Regras automáticas e classificações podem divergir sem você perceber.",
    action: "Alinharia os nomes ao padrão que você já usa com mais frequência.",
  },
  LOW_USAGE_CATEGORY: {
    found: "Algumas categorias parecem não estar sendo utilizadas.",
    why: "Manter nomes ociosos aumenta a complexidade sem trazer clareza.",
    action: "Revisaria se ainda faz sentido mantê-las ou se podem ser fundidas com outra similar.",
  },
  MERGE_SUGGESTION: {
    found: "Identifiquei pares de categorias que poderiam ser consolidados.",
    why: "Menos redundância significa relatórios mais limpos e decisões mais rápidas.",
    action: "Priorizaria fusões que não alterem o histórico de forma confusa.",
  },
};

function shortName(path: string): string {
  const parts = path.split("→").map((p) => p.trim());
  return parts[parts.length - 1] ?? path;
}

function detectMode(question: string, explicit?: ConsultativeMode): ConsultativeMode {
  if (explicit) return explicit;
  if (/resumo|executivo|rapidamente|em poucas palavras/i.test(question)) return "EXECUTIVE";
  if (/detalh|completo|todos os pontos|anal[ií]tico/i.test(question)) return "ANALYTICAL";
  return "CONSULTATIVE";
}

function countProposalBuckets(report: CategoryAuditReport) {
  const mergeCount = report.findings.filter((f) =>
    ["DUPLICATE_CATEGORY", "DUPLICATE_SUBCATEGORY", "MERGE_SUGGESTION", "OVERLAPPING_CATEGORY"].includes(
      f.type,
    ),
  ).length;
  const supplierCount = report.supplierLikeCategories.length;
  const lowUsageCount = report.lowUsageCategories.length;
  return { mergeCount, supplierCount, lowUsageCount };
}

export class VorcaroConsultativeResponseService {
  format(
    report: CategoryAuditReport,
    options: {
      question?: string;
      mode?: ConsultativeMode;
      userId?: string;
      priorUserMessages?: string[];
    } = {},
  ): ConsultativeResponse {
    const userId = options.userId ?? "anonymous";
    if (options.priorUserMessages?.length) {
      categoryAuditPreferenceMemory.recordFromMessages(userId, options.priorUserMessages);
    }
    categoryAuditPreferenceMemory.recordFromMessage(userId, options.question ?? "");

    const mode = detectMode(options.question ?? "", options.mode);
    const recommendations = this.buildRecommendations(report, userId);
    const healthScoreLine = `Sua estrutura de categorias está com nota ${report.healthScore.score}/100 (${report.healthScore.label}).`;

    const structuredProposal = this.buildStructuredProposal(report);
    const message = this.buildMessage(
      report,
      recommendations,
      healthScoreLine,
      structuredProposal,
      mode,
      options.question,
    );

    const hasIssues = report.findings.length > 0;
    const wantsProposal = /melhorar|melhoraria|cadastro|organiz|sugest/i.test(options.question ?? "");

    return {
      message,
      recommendations,
      structuredProposal: hasIssues && wantsProposal ? structuredProposal : null,
      ctaDescription: hasIssues
        ? "Deseja visualizar a proposta detalhada?"
        : "Posso revisar suas categorias novamente quando quiser.",
      includeDashboardAction: false,
      healthScoreLine,
    };
  }

  private buildRecommendations(
    report: CategoryAuditReport,
    userId: string,
  ): ConsultativeRecommendation[] {
    const result: ConsultativeRecommendation[] = [];
    const seen = new Set<CategoryAuditFindingType>();

    for (const improvement of report.topImprovements) {
      if (seen.has(improvement.findingType)) continue;
      const items = improvement.items.filter((i) => !categoryAuditPreferenceMemory.shouldSuppressItem(userId, i));
      if (items.length === 0) continue;

      const copy = CONSULTATIVE_COPY[improvement.findingType];
      const examples =
        items.length > 0
          ? ` Exemplos: ${items.slice(0, 4).map(shortName).join(", ")}.`
          : "";

      result.push({
        whatIFound: copy.found + examples,
        whyItMatters: copy.why,
        whatIWouldDo: copy.action,
        priority: improvement.priority,
      });
      seen.add(improvement.findingType);
    }

    return result.slice(0, 5);
  }

  private buildStructuredProposal(report: CategoryAuditReport): string {
    const { mergeCount, supplierCount, lowUsageCount } = countProposalBuckets(report);
    const lines = ["Posso sugerir uma reorganização com:", ""];

    if (mergeCount > 0) {
      lines.push(`• ${Math.min(mergeCount, 9)} ${mergeCount === 1 ? "ponto" : "pontos"} para consolidar categorias`);
    }
    if (supplierCount > 0) {
      lines.push(
        `• ${supplierCount} ${supplierCount === 1 ? "fornecedor" : "fornecedores"} para transformar em regras automáticas`,
      );
    }
    if (lowUsageCount > 0) {
      lines.push(
        `• ${lowUsageCount} ${lowUsageCount === 1 ? "categoria" : "categorias"} sem uso para revisar`,
      );
    }
    if (lines.length === 2) {
      lines.push("• Sua taxonomia já está bem organizada — apenas ajustes finos.");
    }

    lines.push("", "Deseja visualizar a proposta?");
    return lines.join("\n");
  }

  private buildMessage(
    report: CategoryAuditReport,
    recommendations: ConsultativeRecommendation[],
    healthScoreLine: string,
    structuredProposal: string,
    mode: ConsultativeMode,
    question?: string,
  ): string {
    const lines: string[] = [];

    if (mode === "EXECUTIVE") {
      lines.push(healthScoreLine);
      if (recommendations.length === 0) {
        lines.push("Não vejo ajustes urgentes no momento.");
      } else {
        lines.push(`Prioridade: ${recommendations[0].whatIFound.split(".")[0]}.`);
      }
      lines.push("", "Nada será alterado sem sua confirmação.");
      return sanitizeConsultativeText(lines.join("\n"));
    }

    const opening = /melhorar|cadastro/i.test(question ?? "")
      ? "Analisei seu cadastro de categorias com olhar de organização financeira."
      : report.findings.length > 0
        ? "Analisei suas categorias e separei o que mais impacta sua organização."
        : "Sua estrutura de categorias está bem organizada.";

    lines.push(opening, "", healthScoreLine, "");

    if (recommendations.length === 0) {
      lines.push("Não identifiquei ajustes prioritários agora.", "");
    } else {
      lines.push("Os pontos que mais impactam sua organização financeira:", "");

      const limit = mode === "ANALYTICAL" ? 5 : Math.min(3, recommendations.length);
      for (const rec of recommendations.slice(0, limit)) {
        lines.push("**O que encontrei**", rec.whatIFound, "", "**Por que isso importa**", rec.whyItMatters, "", "**O que eu faria**", rec.whatIWouldDo, "");
      }
    }

    if (/melhorar|cadastro|organiz/i.test(question ?? "") && report.findings.length > 0) {
      lines.push(structuredProposal, "");
    }

    lines.push(
      "Esses ajustes não impedem o uso do sistema, mas deixam relatórios e automações mais confiáveis.",
      "",
      "Nada será alterado automaticamente — qualquer mudança passa pela sua confirmação.",
    );

    return sanitizeConsultativeText(lines.join("\n").trim());
  }
}

export function sanitizeConsultativeText(text: string): string {
  return text.replace(TECHNICAL_PATTERN, "").replace(/\n{3,}/g, "\n\n").trim();
}
