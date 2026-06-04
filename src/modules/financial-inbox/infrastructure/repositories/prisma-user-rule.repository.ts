import type { PrismaClient } from "@prisma/client";
import { USER_RULE_DEFAULT_PRIORITY } from "@/lib/rules/rule-priorities";
import {
  parseRuleAction,
  parseRuleCondition,
  ruleActionSchema,
  ruleConditionSchema,
} from "../../domain/schemas/user-rule.schema";
import type {
  CreateUserRuleInput,
  UserRuleManagementRecord,
  UserRuleRecord,
  UserRuleRepositoryPort,
} from "../../domain/ports/user-rule-repository.port";

function toUserRuleRecord(rule: {
  id: string;
  name: string;
  condition: unknown;
  action: unknown;
  priority: number;
}): UserRuleRecord | null {
  const condition = parseRuleCondition(rule.condition);
  const action = parseRuleAction(rule.action);

  if (!condition || !action) {
    return null;
  }

  return {
    id: rule.id,
    name: rule.name,
    condition,
    action,
    priority: rule.priority,
  };
}

function toUserRuleManagementRecord(rule: {
  id: string;
  name: string;
  description: string | null;
  condition: unknown;
  action: unknown;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserRuleManagementRecord | null {
  const base = toUserRuleRecord(rule);

  if (!base) {
    return null;
  }

  return {
    ...base,
    description: rule.description,
    isActive: rule.isActive,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

export class PrismaUserRuleRepository implements UserRuleRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  async findActiveByUserId(userId: string): Promise<UserRuleRecord[]> {
    const rules = await this.db.userRule.findMany({
      where: { userId, isActive: true },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });

    return rules
      .map((rule) => toUserRuleRecord(rule))
      .filter((rule): rule is UserRuleRecord => rule !== null);
  }

  async findAllByUserId(userId: string): Promise<UserRuleManagementRecord[]> {
    const rules = await this.db.userRule.findMany({
      where: { userId },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    return rules
      .map((rule) => toUserRuleManagementRecord(rule))
      .filter((rule): rule is UserRuleManagementRecord => rule !== null);
  }

  async create(input: CreateUserRuleInput): Promise<UserRuleManagementRecord> {
    const condition = ruleConditionSchema.parse(input.condition);
    const action = ruleActionSchema.parse(input.action);

    const rule = await this.db.userRule.create({
      data: {
        userId: input.userId,
        name: input.name,
        description: input.description,
        condition,
        action,
        priority: input.priority ?? USER_RULE_DEFAULT_PRIORITY,
        isActive: true,
      },
    });

    const record = toUserRuleManagementRecord(rule);

    if (!record) {
      throw new Error("Failed to persist valid user rule");
    }

    return record;
  }

  async deleteById(id: string, userId: string): Promise<boolean> {
    const existing = await this.db.userRule.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      return false;
    }

    await this.db.userRule.delete({ where: { id } });
    return true;
  }
}
