import { resolveCategoryAlias } from "@/lib/categories/category-aliases";
import { normalizeCategoryName } from "@/lib/categories/category-name-normalizer";
import type { AuditCategoryRecord } from "./category-audit-detection";

/** Subcategorias legítimas sob o mesmo pai (ex.: tipos de investimento). */
export const LEGITIMATE_INVESTMENT_SUBS = new Set([
  "acoes",
  "fundos",
  "tesouro direto",
  "criptoativos",
  "investimentos",
  "aporte patrimonial",
]);

const INCOME_HINT = /recebido|receita|recebimento|entrada/i;

export function areLegitimateInvestmentSiblings(
  a: AuditCategoryRecord,
  b: AuditCategoryRecord,
): boolean {
  if (a.parentCategoryId !== b.parentCategoryId || !a.parentCategoryId) return false;
  const na = normalizeCategoryName(a.name);
  const nb = normalizeCategoryName(b.name);
  return LEGITIMATE_INVESTMENT_SUBS.has(na) && LEGITIMATE_INVESTMENT_SUBS.has(nb);
}

export function isIncomeExpenseDistinctPair(a: string, b: string): boolean {
  const na = normalizeCategoryName(a);
  const nb = normalizeCategoryName(b);
  const aIncome = INCOME_HINT.test(na);
  const bIncome = INCOME_HINT.test(nb);
  if (aIncome === bIncome) return false;
  const stripIncome = (n: string) => n.replace(INCOME_HINT, "").replace(/\s+/g, " ").trim();
  const baseA = stripIncome(na);
  const baseB = stripIncome(nb);
  if (baseA && baseB && (baseA === baseB || baseA.startsWith(baseB) || baseB.startsWith(baseA))) {
    return true;
  }
  return na.replace(/\s+/g, "").includes(nb.replace(/\s+/g, "")) && na !== nb;
}

export function isSpecializationUnderSameParent(
  a: AuditCategoryRecord,
  b: AuditCategoryRecord,
): boolean {
  if (a.parentCategoryId !== b.parentCategoryId || !a.parentCategoryId) return false;
  const na = normalizeCategoryName(a.name);
  const nb = normalizeCategoryName(b.name);
  if (na === nb) return false;

  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length > nb.length ? na : nb;

  // Especialização exige extensão com espaço (ex.: Seguro → Seguro Residencial)
  if (!longer.startsWith(`${shorter} `)) return false;

  // Uber vs Uber e Aplicativos — redundância, não especialização legítima
  if (shorter === "uber") return false;

  return true;
}

export function shouldSkipSimilarityPair(
  a: AuditCategoryRecord,
  b: AuditCategoryRecord,
): boolean {
  if (areLegitimateInvestmentSiblings(a, b)) return true;
  if (isIncomeExpenseDistinctPair(a.name, b.name)) return true;
  if (isSpecializationUnderSameParent(a, b)) return true;
  return false;
}

export function shouldSkipInconsistentNaming(
  cat: AuditCategoryRecord,
  categories: AuditCategoryRecord[],
): boolean {
  const na = normalizeCategoryName(cat.name);
  if (LEGITIMATE_INVESTMENT_SUBS.has(na)) return true;

  const alias = resolveCategoryAlias(cat.name);
  if (alias === na) return false;

  if (!cat.parentCategoryId) return false;

  const siblings = categories.filter((c) => c.parentCategoryId === cat.parentCategoryId);
  for (const sib of siblings) {
    if (sib.id !== cat.id && isSpecializationUnderSameParent(cat, sib)) return true;
  }

  return false;
}

export function isMobilitySubcategoryNotSupplier(
  cat: AuditCategoryRecord,
  byId: Map<string, AuditCategoryRecord>,
): boolean {
  if (!cat.parentCategoryId) return false;
  const parent = byId.get(cat.parentCategoryId);
  if (!parent) return false;
  const parentNorm = normalizeCategoryName(parent.name);
  if (!/transporte|mobilidade/i.test(parentNorm)) return false;
  const nameNorm = normalizeCategoryName(cat.name);
  return nameNorm === "uber" || nameNorm === "uber e aplicativos" || nameNorm === "taxi";
}
