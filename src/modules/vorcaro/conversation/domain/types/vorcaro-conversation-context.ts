import type { VorcaroIntent, VorcaroToolName } from "@/modules/vorcaro/intent/domain/types/vorcaro-intent";
import type { VorcaroChatTopic } from "./vorcaro-conversation";

export const VORCARO_CONVERSATION_STAGES = [
  "exploring",
  "listing",
  "advising",
  "follow_up",
] as const;

export type VorcaroConversationStage = (typeof VORCARO_CONVERSATION_STAGES)[number];

export type VorcaroConversationContext = {
  currentTopic: VorcaroChatTopic;
  lastIntent: VorcaroIntent | null;
  lastToolUsed: VorcaroToolName | null;
  conversationStage: VorcaroConversationStage;
  lastEntitiesMentioned: string[];
  topicLocked: boolean;
  lockedIntent: VorcaroIntent | null;
  contextSwitchBlocked: boolean;
};

export type VorcaroResponseCritique = {
  approved: boolean;
  issues: string[];
  score: number;
  suggestedIntent?: VorcaroIntent;
};

export type VorcaroSelfCorrectionDiagnostic = {
  userMessage: string;
  context: VorcaroConversationContext;
  selectedIntent: VorcaroIntent;
  selectedTools: string[];
  critique: VorcaroResponseCritique;
  regenerated: boolean;
  humanizationApplied: boolean;
  finalAnswerPreview: string;
  at: string;
};

export const VORCARO_CRITIC_APPROVAL_THRESHOLD = 0.7;
