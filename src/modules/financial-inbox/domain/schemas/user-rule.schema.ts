import { z } from "zod";
import type { ExtractedTransactionType } from "../ports/ai-service.port";

export const ruleConditionSchema = z.object({
  operator: z.enum(["contains", "equals"]),
  field: z.enum(["description", "rawContent", "category", "paymentMethod"]),
  value: z.string().min(1),
});

export const ruleActionSchema = z.object({
  set: z.enum(["type", "amount", "description", "category", "date", "paymentMethod"]),
  value: z.union([z.string(), z.number()]),
});

export type RuleCondition = z.infer<typeof ruleConditionSchema>;
export type RuleAction = z.infer<typeof ruleActionSchema>;

export const learningInputSignalSchema = z.object({
  keyword: z.string().min(1),
});

export const learningOutputSignalSchema = z.object({
  category: z.string().optional(),
  categoryId: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentMethodId: z.string().optional(),
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]).optional(),
});

export type LearningInputSignal = z.infer<typeof learningInputSignalSchema>;
export type LearningOutputSignal = z.infer<typeof learningOutputSignalSchema>;

export function parseRuleCondition(data: unknown): RuleCondition | null {
  const parsed = ruleConditionSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export function parseRuleAction(data: unknown): RuleAction | null {
  const parsed = ruleActionSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export function parseLearningInputSignal(data: unknown): LearningInputSignal | null {
  const parsed = learningInputSignalSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export function parseLearningOutputSignal(data: unknown): LearningOutputSignal | null {
  const parsed = learningOutputSignalSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export function isValidTransactionType(value: string): value is ExtractedTransactionType {
  return value === "EXPENSE" || value === "INCOME" || value === "TRANSFER" || value === "UNKNOWN";
}
