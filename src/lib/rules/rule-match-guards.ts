import { parseRuleCondition } from "@/modules/financial-inbox/domain/schemas/user-rule.schema";

/**
 * Campos opcionais para texto de busca em regras.
 * No domínio atual (FinancialInbox / FinancialExtraction): description, rawContent, descricaoBase.
 * merchantName, counterparty, rawDescription e title são aceitos quando presentes no input.
 */
export type RuleMatchTextFields = {
  description?: string | null;
  rawContent?: string | null;
  descricaoBase?: string | null;
  merchantName?: string | null;
  counterparty?: string | null;
  rawDescription?: string | null;
  title?: string | null;
};

export function buildNormalizedSearchText(fields: RuleMatchTextFields): string {
  return [
    fields.description,
    fields.merchantName,
    fields.counterparty,
    fields.rawDescription,
    fields.rawContent,
    fields.title,
    fields.descricaoBase,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .trim();
}

export function isAmbiguousKeywordBlocked(keyword: string, searchText: string): boolean {
  const hay = searchText.toLowerCase();
  const k = keyword.toLowerCase();

  if (k === "uber") {
    return /\buber\s*eats\b/i.test(hay);
  }
  if (k === "99") {
    return /\b99\s*food\b/i.test(hay) || hay.includes("99food");
  }

  return false;
}

export type RuleFieldContext = {
  description: string;
  rawContent: string;
  category: string;
  paymentMethod: string;
};

export function buildRuleFieldContext(
  fields: RuleMatchTextFields,
  extras?: { category?: string | null; paymentMethod?: string | null },
): RuleFieldContext {
  const normalized = buildNormalizedSearchText(fields).toLowerCase();
  return {
    description: (fields.description ?? normalized).toLowerCase(),
    rawContent: (fields.rawContent ?? normalized).toLowerCase(),
    category: (extras?.category ?? "").toLowerCase(),
    paymentMethod: (extras?.paymentMethod ?? "").toLowerCase(),
  };
}

export function ruleMatchesSearchText(
  condition: { operator: string; field: string; value: string },
  normalizedSearchText: string,
  fieldContext: RuleFieldContext,
): boolean {
  const needle = condition.value.toLowerCase();
  const haystack = normalizedSearchText.toLowerCase();

  if (condition.field === "description" || condition.field === "rawContent") {
    if (condition.operator === "equals") {
      const fieldValue =
        condition.field === "description" ? fieldContext.description : fieldContext.rawContent;
      return fieldValue === needle || haystack === needle;
    }
    return haystack.includes(needle);
  }

  const fieldValue = fieldContext[condition.field as keyof RuleFieldContext] ?? "";

  if (condition.operator === "equals") {
    return fieldValue === needle;
  }

  return fieldValue.includes(needle);
}

export function sortRulesForMatching<
  T extends { condition: unknown; priority: number; createdAt?: Date | string },
>(rules: T[]): T[] {
  return [...rules].sort((a, b) => {
    const priorityDiff = b.priority - a.priority;
    if (priorityDiff !== 0) return priorityDiff;

    const ca = parseRuleCondition(a.condition);
    const cb = parseRuleCondition(b.condition);
    const lengthDiff = (cb?.value.length ?? 0) - (ca?.value.length ?? 0);
    if (lengthDiff !== 0) return lengthDiff;

    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aTime - bTime;
  });
}
