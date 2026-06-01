import type { RuleAction, RuleCondition } from "../schemas/user-rule.schema";

export interface UserRuleRecord {
  id: string;
  name: string;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
}

export interface UserRuleManagementRecord extends UserRuleRecord {
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRuleInput {
  userId: string;
  name: string;
  description?: string;
  condition: RuleCondition;
  action: RuleAction;
  priority?: number;
}

export interface UserRuleRepositoryPort {
  findActiveByUserId(userId: string): Promise<UserRuleRecord[]>;
  findAllByUserId(userId: string): Promise<UserRuleManagementRecord[]>;
  create(input: CreateUserRuleInput): Promise<UserRuleManagementRecord>;
  deleteById(id: string, userId: string): Promise<boolean>;
}
