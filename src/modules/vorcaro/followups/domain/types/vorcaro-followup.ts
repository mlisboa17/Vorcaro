import type { VorcaroFollowUpStatus } from "@prisma/client";

export const VORCARO_FOLLOW_UP_ENTITY_TYPES = ["RECEIVABLE", "GOAL", "ALERT"] as const;
export type VorcaroFollowUpEntityType = (typeof VORCARO_FOLLOW_UP_ENTITY_TYPES)[number];

export const VORCARO_FOLLOW_UP_MAX_REMINDERS = 5;

export const VORCARO_FOLLOW_UP_TERMINAL_STATUSES: VorcaroFollowUpStatus[] = [
  "COMPLETED",
  "DISMISSED",
  "EXPIRED",
];

export type VorcaroFollowUpRecord = {
  id: string;
  userId: string;
  fingerprint: string;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  title: string;
  description: string;
  status: VorcaroFollowUpStatus;
  nextCheckAt: Date;
  lastReminderAt: Date | null;
  checkCount: number;
  version: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateVorcaroFollowUpInput = {
  userId: string;
  fingerprint: string;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  title: string;
  description: string;
  status?: VorcaroFollowUpStatus;
  nextCheckAt: Date;
  metadata?: Record<string, unknown> | null;
};
