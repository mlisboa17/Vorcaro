import { parseRuleCondition } from "@/modules/financial-inbox/domain/schemas/user-rule.schema";

export function isAmbiguousKeywordBlocked(
  keyword: string,
  description: string,
  rawContent: string,
): boolean {
  const hay = `${description} ${rawContent}`.toLowerCase();
  const k = keyword.toLowerCase();

  if (k === "uber") {
    return /\buber\s*eats\b/i.test(hay);
  }
  if (k === "99") {
    return /\b99\s*food\b/i.test(hay) || hay.includes("99food");
  }

  return false;
}

export function ruleMatchesSearchText(
  condition: { operator: string; field: string; value: string },
  description: string,
  rawContent: string,
): boolean {
  const context = {
    description: description.toLowerCase(),
    rawContent: rawContent.toLowerCase(),
    category: "",
    paymentMethod: "",
  };

  const needle = condition.value.toLowerCase();

  if (condition.operator === "equals") {
    const fieldValue = context[condition.field as keyof typeof context] ?? "";
    return fieldValue === needle;
  }

  if (condition.field === "description") {
    return context.description.includes(needle) || context.rawContent.includes(needle);
  }

  const fieldValue = context[condition.field as keyof typeof context] ?? "";
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
