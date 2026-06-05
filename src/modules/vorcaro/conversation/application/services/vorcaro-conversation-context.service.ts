import type { VorcaroIntent, VorcaroToolName } from "@/modules/vorcaro/intent/domain/types/vorcaro-intent";
import type { VorcaroChatTopic } from "../../domain/types/vorcaro-conversation";
import type { VorcaroConversationContext, VorcaroConversationStage } from "../../domain/types/vorcaro-conversation-context";
import {
  extractEntitiesMentioned,
  isTopicLockMessage,
  resolveLockedIntent,
} from "../../domain/services/vorcaro-topic-lock";

export type ResolveConversationContextInput = {
  message: string;
  previousTopic?: string | null;
  lastIntent?: VorcaroIntent | null;
  lastToolUsed?: VorcaroToolName | null;
  detectTopic: (message: string, previousTopic?: string | null) => VorcaroChatTopic;
};

function inferStage(intent: VorcaroIntent | null, message: string): VorcaroConversationStage {
  if (intent === "CATEGORY_LIST" || intent === "CARD_LIST") return "listing";
  if (intent === "CATEGORY_AUDIT") return "advising";
  if (isTopicLockMessage(message)) return "follow_up";
  return "exploring";
}

export class VorcaroConversationContextService {
  resolve(input: ResolveConversationContextInput): VorcaroConversationContext {
    const previousTopic = (input.previousTopic as VorcaroChatTopic | null) ?? null;
    const detectedTopic = input.detectTopic(input.message, previousTopic);
    const topicLocked =
      previousTopic !== null &&
      previousTopic !== "general" &&
      detectedTopic === previousTopic &&
      isTopicLockMessage(input.message);

    const lockedIntent = topicLocked || detectedTopic !== "general"
      ? resolveLockedIntent(detectedTopic, input.message, input.lastIntent ?? null)
      : null;

    const contextSwitchBlocked =
      topicLocked &&
      lockedIntent !== null &&
      input.lastIntent !== null &&
      lockedIntent !== input.lastIntent;

    const currentTopic = detectedTopic;
    const conversationStage = inferStage(lockedIntent ?? input.lastIntent ?? null, input.message);

    return {
      currentTopic,
      lastIntent: input.lastIntent ?? null,
      lastToolUsed: input.lastToolUsed ?? null,
      conversationStage,
      lastEntitiesMentioned: extractEntitiesMentioned(input.message, currentTopic),
      topicLocked,
      lockedIntent,
      contextSwitchBlocked,
    };
  }
}
