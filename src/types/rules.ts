import type { RuleAction, RuleCondition } from "@/modules/financial-inbox/domain/schemas/user-rule.schema";

export interface UserRuleItem {
  id: string;
  name: string;
  description: string | null;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  isActive: boolean;
  conditionLabel: string;
  actionLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningPatternItem {
  id: string;
  patternType: string;
  patternTypeLabel: string;
  keyword: string;
  targetLabel: string;
  confidence: number;
  occurrences: number;
  lastSeenAt: string;
  createdAt: string;
}

export interface RulesListResponse {
  rules: UserRuleItem[];
  patterns: LearningPatternItem[];
}

export type RulesTab = "manual" | "memory";

export const RULES_TABS: { value: RulesTab; label: string }[] = [
  { value: "manual", label: "Regras Manuais" },
  { value: "memory", label: "Memória do Sistema" },
];

export type ConditionFieldOption = RuleCondition["field"];
export type ConditionOperatorOption = RuleCondition["operator"];
export type ActionFieldOption = RuleAction["set"];

export interface CreateRuleFormValues {
  name: string;
  conditionField: ConditionFieldOption;
  conditionOperator: ConditionOperatorOption;
  conditionValue: string;
  actionField: ActionFieldOption;
  actionValue: string;
  priority: number;
}

export const CONDITION_FIELD_OPTIONS: { value: ConditionFieldOption; label: string }[] = [
  { value: "description", label: "Descrição" },
  { value: "rawContent", label: "Texto completo" },
  { value: "category", label: "Categoria" },
  { value: "paymentMethod", label: "Método de pagamento" },
];

export const CONDITION_OPERATOR_OPTIONS: { value: ConditionOperatorOption; label: string }[] = [
  { value: "contains", label: "Contém" },
  { value: "equals", label: "Igual a" },
];

export const ACTION_FIELD_OPTIONS: { value: ActionFieldOption; label: string }[] = [
  { value: "category", label: "Categoria" },
  { value: "paymentMethod", label: "Método de pagamento" },
  { value: "description", label: "Descrição" },
  { value: "type", label: "Tipo" },
  { value: "amount", label: "Valor" },
  { value: "date", label: "Data" },
];

export const TRANSACTION_TYPE_OPTIONS = [
  { value: "EXPENSE", label: "Despesa" },
  { value: "INCOME", label: "Receita" },
  { value: "TRANSFER", label: "Transferência" },
] as const;
