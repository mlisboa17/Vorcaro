import { resolveCategoryAlias } from "@/lib/categories/category-aliases";
import {
  categoryNamesMatch,
  normalizeCategoryName,
} from "@/lib/categories/category-name-normalizer";
import {
  isMobilitySubcategoryNotSupplier,
  shouldSkipInconsistentNaming,
  shouldSkipSimilarityPair,
} from "./category-audit-exemptions";
import { enrichAuditReport } from "./category-audit-health";
import type {
  CategoryAuditFinding,
  CategoryAuditFindingType,
  CategoryAuditMergeSuggestion,
  CategoryAuditReport,
  CategoryAuditSeverity,
} from "../types/category-audit";

/** Somente leitura — nenhuma mutação de categorias, regras ou transações. */
export type AuditCategoryRecord = {
  id: string;
  name: string;
  parentCategoryId: string | null;
  isActive: boolean;
  isSystem?: boolean;
};

export type AuditContext = {
  categories: AuditCategoryRecord[];
  ruleCategoryNames: string[];
  patternCategories: string[];
  transactionCountByCategoryId: Record<string, number>;
};

export const KNOWN_SUPPLIER_NAMES: ReadonlySet<string> = new Set([
  "ifood",
  "ze delivery",
  "rappi",
  "uber eats",
  "uber",
  "99food",
  "netflix",
  "spotify",
  "amazon prime",
  "mercado livre",
  "nubank",
  "picpay",
  "ze delivery",
  "99",
  "cabify",
  "rappi",
]);

function pluralStem(name: string): string {
  const n = normalizeCategoryName(name);
  if (n.endsWith("es") && n.length > 4) return n.slice(0, -2);
  if (n.endsWith("s") && n.length > 3) return n.slice(0, -1);
  return n;
}

function namesAreSimilar(a: string, b: string): boolean {
  if (categoryNamesMatch(a, b)) return true;
  const na = normalizeCategoryName(a);
  const nb = normalizeCategoryName(b);
  if (na === nb) return true;
  if (pluralStem(na) === pluralStem(nb)) return true;
  const aliasA = resolveCategoryAlias(a);
  const aliasB = resolveCategoryAlias(b);
  if (aliasA === aliasB && aliasA !== na && aliasA !== nb) {
    return false;
  }
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length > nb.length ? na : nb;
  if (shorter.length >= 3 && longer.includes(shorter)) return true;
  return false;
}

function displayPath(
  cat: AuditCategoryRecord,
  byId: Map<string, AuditCategoryRecord>,
): string {
  if (!cat.parentCategoryId) return cat.name;
  const parent = byId.get(cat.parentCategoryId);
  return parent ? `${parent.name} → ${cat.name}` : cat.name;
}

function isSupplierLikeCategoryName(name: string): boolean {
  const normalized = normalizeCategoryName(name);
  if (KNOWN_SUPPLIER_NAMES.has(normalized)) return true;
  for (const supplier of KNOWN_SUPPLIER_NAMES) {
    if (normalized.includes(supplier) || supplier.includes(normalized)) {
      if (normalized.length <= supplier.length + 4) return true;
    }
  }
  return false;
}

function pickCanonicalName(a: string, b: string): string {
  const aliasA = resolveCategoryAlias(a);
  const aliasB = resolveCategoryAlias(b);
  if (aliasA !== normalizeCategoryName(a) && aliasB === normalizeCategoryName(b)) return b;
  if (aliasB !== normalizeCategoryName(b) && aliasA === normalizeCategoryName(a)) return a;
  return a.length >= b.length ? a : b;
}

function findingKey(type: CategoryAuditFindingType, items: string[]): string {
  return `${type}:${[...items].sort().join("|")}`;
}

function buildSummary(findings: CategoryAuditFinding[]): CategoryAuditReport["summary"] {
  return {
    totalFindings: findings.length,
    high: findings.filter((f) => f.severity === "HIGH").length,
    medium: findings.filter((f) => f.severity === "MEDIUM").length,
    low: findings.filter((f) => f.severity === "LOW").length,
  };
}

function addFinding(
  findings: CategoryAuditFinding[],
  seen: Set<string>,
  finding: CategoryAuditFinding,
): void {
  const key = findingKey(finding.type, finding.currentItems);
  if (seen.has(key)) return;
  seen.add(key);
  findings.push(finding);
}

export function analyzeCategoryTaxonomy(ctx: AuditContext): CategoryAuditReport {
  const findings: CategoryAuditFinding[] = [];
  const seen = new Set<string>();
  const suggestedMerges: CategoryAuditMergeSuggestion[] = [];
  const supplierLikeCategories: string[] = [];
  const lowUsageCategories: string[] = [];

  const byId = new Map(ctx.categories.map((c) => [c.id, c]));
  const roots = ctx.categories.filter((c) => !c.parentCategoryId);
  const subs = ctx.categories.filter((c) => c.parentCategoryId);

  for (let i = 0; i < roots.length; i++) {
    for (let j = i + 1; j < roots.length; j++) {
      const a = roots[i];
      const b = roots[j];
      if (!namesAreSimilar(a.name, b.name)) continue;
      if (shouldSkipSimilarityPair(a, b)) continue;

      const target = pickCanonicalName(a.name, b.name);
      const items = [a.name, b.name];

      addFinding(findings, seen, {
        type: "DUPLICATE_CATEGORY",
        severity: "HIGH",
        title: "Categorias raiz semelhantes",
        description: `As categorias "${a.name}" e "${b.name}" parecem duplicadas ou redundantes.`,
        currentItems: items,
        suggestedAction: `Sugestão: manter "${target}" e fundir ou remover a outra após revisão manual.`,
        suggestedTarget: target,
        confidence: 0.92,
      });

      suggestedMerges.push({ sources: items, target, confidence: 0.9 });
    }
  }

  for (let i = 0; i < subs.length; i++) {
    for (let j = i + 1; j < subs.length; j++) {
      const a = subs[i];
      const b = subs[j];
      if (!namesAreSimilar(a.name, b.name)) continue;
      if (shouldSkipSimilarityPair(a, b)) continue;

      const pathA = displayPath(a, byId);
      const pathB = displayPath(b, byId);
      const sameParent = a.parentCategoryId === b.parentCategoryId;
      const target = pickCanonicalName(a.name, b.name);

      if (sameParent) {
        addFinding(findings, seen, {
          type: "DUPLICATE_SUBCATEGORY",
          severity: "MEDIUM",
          title: "Subcategorias duplicadas",
          description: `"${pathA}" e "${pathB}" estão na mesma categoria pai e parecem redundantes.`,
          currentItems: [pathA, pathB],
          suggestedAction: `Sugestão: fundir em "${target}" dentro da mesma categoria pai.`,
          suggestedTarget: target,
          confidence: 0.93,
        });
      } else {
        addFinding(findings, seen, {
          type: "OVERLAPPING_CATEGORY",
          severity: "MEDIUM",
          title: `"${a.name}" sobreposto em categorias diferentes`,
          description: `"${pathA}" e "${pathB}" têm nomes semelhantes em ramos distintos da taxonomia.`,
          currentItems: [pathA, pathB],
          suggestedAction: `Sugestão: escolher um único local para "${target}" e migrar lançamentos manualmente.`,
          suggestedTarget: target,
          confidence: 0.88,
        });
      }

      addFinding(findings, seen, {
        type: "MERGE_SUGGESTION",
        severity: "MEDIUM",
        title: "Oportunidade de fusão",
        description: `Considere fundir "${a.name}" e "${b.name}" em uma única subcategoria canônica.`,
        currentItems: [pathA, pathB],
        suggestedAction: `Sugestão: usar "${target}" como nome canônico.`,
        suggestedTarget: target,
        confidence: 0.86,
      });

      suggestedMerges.push({ sources: [pathA, pathB], target, confidence: 0.85 });
    }
  }

  const subsByNorm = new Map<string, AuditCategoryRecord[]>();
  for (const sub of subs) {
    const key = normalizeCategoryName(sub.name);
    const list = subsByNorm.get(key) ?? [];
    list.push(sub);
    subsByNorm.set(key, list);
  }

  for (const [, group] of subsByNorm) {
    if (group.length < 2) continue;
    const parents = new Set(group.map((g) => g.parentCategoryId));
    if (parents.size < 2) continue;

    const paths = group.map((g) => displayPath(g, byId));
    const name = group[0].name;
    const target = pickCanonicalName(group[0].name, group[1].name);

    addFinding(findings, seen, {
      type: "OVERLAPPING_CATEGORY",
      severity: "MEDIUM",
      title: `"${name}" repetido em múltiplas categorias`,
      description: `A subcategoria "${name}" aparece em ${group.length} ramos diferentes (ex.: IOF, Juros).`,
      currentItems: paths,
      suggestedAction: `Sugestão: centralizar "${target}" em uma única categoria pai.`,
      suggestedTarget: target,
      confidence: 0.91,
    });
  }

  for (const cat of ctx.categories) {
    if (isMobilitySubcategoryNotSupplier(cat, byId)) continue;
    if (!isSupplierLikeCategoryName(cat.name)) continue;
    const path = displayPath(cat, byId);
    supplierLikeCategories.push(path);

    const isRoot = !cat.parentCategoryId;
    addFinding(findings, seen, {
      type: "SUPPLIER_AS_CATEGORY",
      severity: isRoot ? "HIGH" : "MEDIUM",
      title: "Fornecedor usado como categoria",
      description: `"${path}" parece ser um fornecedor ou marca, não uma categoria de classificação.`,
      currentItems: [path],
      suggestedAction:
        "Sugestão: mover lançamentos para uma subcategoria adequada (ex.: Delivery, Uber e Aplicativos) e usar regras para classificar automaticamente.",
      suggestedTarget: resolveCategoryAlias(cat.name) !== normalizeCategoryName(cat.name)
        ? resolveCategoryAlias(cat.name)
        : undefined,
      confidence: 0.94,
    });
  }

  for (const cat of ctx.categories) {
    if (shouldSkipInconsistentNaming(cat, ctx.categories)) continue;
    const na = normalizeCategoryName(cat.name);
    const alias = resolveCategoryAlias(cat.name);
    if (alias === na) continue;

    const canonicalExists = ctx.categories.some(
      (c) => normalizeCategoryName(c.name) === alias || pluralStem(c.name) === pluralStem(alias),
    );
    if (!canonicalExists) continue;

    const path = displayPath(cat, byId);
    addFinding(findings, seen, {
      type: "INCONSISTENT_NAMING",
      severity: "LOW",
      title: "Nome inconsistente com taxonomia canônica",
      description: `"${path}" diverge do padrão canônico "${alias}".`,
      currentItems: [path],
      suggestedAction: `Sugestão: renomear para "${alias}" após confirmar com suas regras e lançamentos.`,
      suggestedTarget: alias,
      confidence: 0.82,
    });
  }

  const referencedNames = [
    ...ctx.ruleCategoryNames,
    ...ctx.patternCategories,
  ].filter(Boolean);

  for (const refName of referencedNames) {
    const match = ctx.categories.find((c) => categoryNamesMatch(c.name, refName));
    if (!match) continue;

    const similar = ctx.categories.filter(
      (c) => c.id !== match.id && namesAreSimilar(c.name, refName),
    );
    for (const other of similar) {
      const pathMatch = displayPath(match, byId);
      const pathOther = displayPath(other, byId);
      addFinding(findings, seen, {
        type: "INCONSISTENT_NAMING",
        severity: "LOW",
        title: "Regra ou padrão aponta para nome ambíguo",
        description: `Regras/padrões usam "${refName}", mas existem também "${pathOther}".`,
        currentItems: [pathMatch, pathOther],
        suggestedAction: "Sugestão: alinhar regras e taxonomia para um único nome canônico.",
        suggestedTarget: pickCanonicalName(match.name, other.name),
        confidence: 0.8,
      });
    }
  }

  for (const cat of ctx.categories) {
    if (!cat.isActive || cat.isSystem) continue;
    const count = ctx.transactionCountByCategoryId[cat.id] ?? 0;
    if (count > 0) continue;

    const path = displayPath(cat, byId);
    lowUsageCategories.push(path);

    addFinding(findings, seen, {
      type: "LOW_USAGE_CATEGORY",
      severity: "LOW",
      title: "Categoria sem uso",
      description: `"${path}" não possui lançamentos confirmados.`,
      currentItems: [path],
      suggestedAction: "Sugestão: revisar se a categoria ainda é necessária ou fundir com outra similar.",
      confidence: 0.78,
    });
  }

  findings.sort((a, b) => {
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const diff = severityOrder[a.severity] - severityOrder[b.severity];
    if (diff !== 0) return diff;
    return b.confidence - a.confidence;
  });

  return enrichAuditReport({
    findings,
    summary: buildSummary(findings),
    suggestedMerges: dedupeMerges(suggestedMerges),
    supplierLikeCategories: [...new Set(supplierLikeCategories)],
    lowUsageCategories: [...new Set(lowUsageCategories)],
  });
}

function dedupeMerges(merges: CategoryAuditMergeSuggestion[]): CategoryAuditMergeSuggestion[] {
  const seen = new Set<string>();
  const result: CategoryAuditMergeSuggestion[] = [];
  for (const merge of merges) {
    const key = `${[...merge.sources].sort().join("|")}→${merge.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(merge);
  }
  return result;
}
