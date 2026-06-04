import type { VorcaroActionStatus } from "@prisma/client";

export const VORCARO_ACTION_EXPIRATION_MINUTES = 15;
export const VORCARO_ACTION_INTERPRETER_MAX_AGE_MINUTES = 5;
export const VORCARO_ACTION_CREATE_RATE_LIMIT_PER_HOUR = 40;
export const VORCARO_ACTION_MUTATION_RATE_LIMIT_PER_HOUR = 60;

export const VORCARO_ACTION_TYPES = [
  "OPEN_RECEIVABLE",
  "OPEN_ALERT",
  "OPEN_GOAL",
  "OPEN_COMMITMENT",
  "OPEN_SUBSCRIPTION",
  "OPEN_MONEY_LEAK",
  "CREATE_RULE_SUGGESTION",
  "CREATE_GOAL_SUGGESTION",
  "OPEN_TIMELINE",
  "OPEN_NOTIFICATION",
  "OPEN_DASHBOARD_SECTION",
] as const;

export type VorcaroActionType = (typeof VORCARO_ACTION_TYPES)[number];

export type VorcaroToolAction = {
  type: VorcaroActionType;
  title: string;
  description: string;
  payload: Record<string, unknown>;
};

export type VorcaroActionExecutionResult = {
  status: "EXECUTED" | "FAILED";
  targetUrl?: string;
  navigationPayload?: Record<string, unknown>;
  title: string;
  message: string;
};

export type VorcaroActionProposalRecord = {
  id: string;
  userId: string;
  actionType: VorcaroActionType;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  status: VorcaroActionStatus;
  approvedAt: Date | null;
  executedAt: Date | null;
  failedAt: Date | null;
  expiresAt: Date;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateVorcaroActionProposalInput = {
  userId: string;
  type: VorcaroActionType;
  title: string;
  description: string;
  payload: Record<string, unknown>;
};
