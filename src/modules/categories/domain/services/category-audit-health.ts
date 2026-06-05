import type {
  CategoryAuditFinding,
  CategoryAuditImprovement,
  CategoryAuditReport,
  TaxonomyHealthScore,
} from "../types/category-audit";

const SEVERITY_PENALTY = { HIGH: 8, MEDIUM: 3, LOW: 1 } as const;

const HUMAN_TITLES: Record<CategoryAuditFinding["type"], string> = {
  DUPLICATE_CATEGORY: "Categorias raiz muito parecidas",
  DUPLICATE_SUBCATEGORY: "Subcategorias que dividem o mesmo tipo de gasto",
  SUPPLIER_AS_CATEGORY: "Empresas cadastradas como categoria",
  OVERLAPPING_CATEGORY: "Mesmo conceito em grupos diferentes",
  INCONSISTENT_NAMING: "Nomes que podem confundir relatórios",
  LOW_USAGE_CATEGORY: "Categorias sem uso recente",
  MERGE_SUGGESTION: "Oportunidade de consolidar categorias",
};

const IMPACT_BY_TYPE: Record<CategoryAuditFinding["type"], string> = {
  DUPLICATE_CATEGORY: "Relatórios fragmentados e comparações imprecisas",
  DUPLICATE_SUBCATEGORY: "Gastos similares espalhados em categorias paralelas",
  SUPPLIER_AS_CATEGORY: "Análises por tipo de gasto ficam inconsistentes",
  OVERLAPPING_CATEGORY: "Dificuldade para enxergar totais consolidados",
  INCONSISTENT_NAMING: "Regras e automações podem classificar de formas diferentes",
  LOW_USAGE_CATEGORY: "Taxonomia inchada sem benefício prático",
  MERGE_SUGGESTION: "Organização mais simples e previsível",
};

function severityToPriority(severity: CategoryAuditFinding["severity"]): CategoryAuditImprovement["priority"] {
  if (severity === "HIGH") return "high";
  if (severity === "MEDIUM") return "medium";
  return "low";
}

function impactScore(finding: CategoryAuditFinding): number {
  const severityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 }[finding.severity];
  return severityWeight * finding.confidence * 100;
}

export function computeTaxonomyHealthScore(findings: CategoryAuditFinding[]): TaxonomyHealthScore {
  let score = 100;
  for (const f of findings) {
    score -= SEVERITY_PENALTY[f.severity];
  }
  const clamped = Math.max(0, Math.min(100, score));
  let label: TaxonomyHealthScore["label"];
  if (clamped >= 90) label = "Excelente";
  else if (clamped >= 75) label = "Boa";
  else if (clamped >= 60) label = "Regular";
  else label = "Precisa atenção";
  return { score: clamped, label };
}

export function buildTopImprovements(
  findings: CategoryAuditFinding[],
  limit = 5,
): CategoryAuditImprovement[] {
  const seen = new Set<string>();
  const ranked = [...findings]
    .sort((a, b) => impactScore(b) - impactScore(a))
    .filter((f) => {
      const key = `${f.type}:${f.currentItems.slice().sort().join("|")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return f.type !== "MERGE_SUGGESTION";
    })
    .slice(0, limit);

  return ranked.map((f, index) => ({
    id: `improvement-${index + 1}`,
    priority: severityToPriority(f.severity),
    title: HUMAN_TITLES[f.type],
    description: f.description,
    impactLabel: IMPACT_BY_TYPE[f.type],
    items: f.currentItems,
    findingType: f.type,
  }));
}

export function enrichAuditReport(report: Omit<CategoryAuditReport, "healthScore" | "topImprovements">): CategoryAuditReport {
  return {
    ...report,
    healthScore: computeTaxonomyHealthScore(report.findings),
    topImprovements: buildTopImprovements(report.findings),
  };
}
