import type { RuleAction, RuleCondition } from "@/modules/financial-inbox/domain/schemas/user-rule.schema";
import type { LearningOutputSignal } from "@/modules/financial-inbox/domain/schemas/user-rule.schema";

const FIELD_LABELS: Record<RuleCondition["field"], string> = {
  description: "descrição",
  rawContent: "texto",
  category: "categoria",
  paymentMethod: "método de pagamento",
};

const OPERATOR_LABELS: Record<RuleCondition["operator"], string> = {
  contains: "contém",
  equals: "é igual a",
};

const ACTION_FIELD_LABELS: Record<RuleAction["set"], string> = {
  type: "tipo",
  amount: "valor",
  description: "descrição",
  category: "categoria",
  date: "data",
  paymentMethod: "método de pagamento",
};

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  EXPENSE: "Despesa",
  INCOME: "Receita",
  TRANSFER: "Transferência",
  UNKNOWN: "Indefinido",
};

const PATTERN_TYPE_LABELS: Record<string, string> = {
  categorization_preference: "Categoria",
  payment_method_preference: "Método de pagamento",
};

export function formatRuleConditionLabel(condition: RuleCondition): string {
  const field = FIELD_LABELS[condition.field];
  const operator = OPERATOR_LABELS[condition.operator];
  return `Se ${field} ${operator} "${condition.value}"`;
}

export function formatRuleActionLabel(action: RuleAction): string {
  const field = ACTION_FIELD_LABELS[action.set];
  const valueLabel =
    action.set === "type"
      ? (TRANSACTION_TYPE_LABELS[String(action.value)] ?? String(action.value))
      : action.set === "amount"
        ? `R$ ${Number(action.value).toFixed(2).replace(".", ",")}`
        : String(action.value);

  return `Defina ${field} para "${valueLabel}"`;
}

export function formatPatternTypeLabel(patternType: string): string {
  return PATTERN_TYPE_LABELS[patternType] ?? patternType;
}

export function formatPatternTargetLabel(output: LearningOutputSignal): string {
  if (output.category) {
    return output.category;
  }

  if (output.paymentMethod) {
    return output.paymentMethod;
  }

  if (output.type) {
    return TRANSACTION_TYPE_LABELS[output.type] ?? output.type;
  }

  return "—";
}

export function buildRuleNameFromForm(
  condition: RuleCondition,
  action: RuleAction,
): string {
  return `${formatRuleConditionLabel(condition)} → ${ACTION_FIELD_LABELS[action.set]}`;
}
