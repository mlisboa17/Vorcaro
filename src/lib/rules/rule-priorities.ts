import { isSystemDefaultRuleDescription } from "./default-categorization-rules";

/** Prioridade padrão para regras criadas pelo usuário (vence sistema e aprendizado). */
export const USER_RULE_DEFAULT_PRIORITY = 100;

/** Prioridade de referência para padrões aprendidos (não persistida em UserRule). */
export const LEARNED_PATTERN_REFERENCE_PRIORITY = 10;

export function partitionRulesByOrigin<T extends { description: string | null }>(rules: T[]) {
  const userRules: T[] = [];
  const systemRules: T[] = [];

  for (const rule of rules) {
    if (isSystemDefaultRuleDescription(rule.description)) {
      systemRules.push(rule);
    } else {
      userRules.push(rule);
    }
  }

  return { userRules, systemRules };
}
