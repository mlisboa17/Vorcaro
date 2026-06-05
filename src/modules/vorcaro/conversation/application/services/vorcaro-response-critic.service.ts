import type { VorcaroIntent } from "@/modules/vorcaro/intent/domain/types/vorcaro-intent";
import type {
  VorcaroConversationContext,
  VorcaroResponseCritique,
} from "../../domain/types/vorcaro-conversation-context";
import { VORCARO_CRITIC_APPROVAL_THRESHOLD } from "../../domain/types/vorcaro-conversation-context";

const CASHFLOW_MARKERS = [
  /fluxo de caixa/i,
  /ficar[aá]?\s+negativ/i,
  /saldo projetado/i,
  /pr[oó]ximo m[eê]s/i,
  /previs[aã]o\s*30/i,
];

const TOPIC_ALLOWED_INTENTS: Partial<Record<string, VorcaroIntent[]>> = {
  categories: ["CATEGORY_LIST", "CATEGORY_AUDIT", "RULES_AUTOMATIONS"],
  cards: ["CARD_LIST"],
  cashflow: ["CASHFLOW", "STATUS"],
};

function isListRequest(message: string): boolean {
  return /^(mostre|liste|listar|quais|me mostre|me liste)\b/i.test(message.trim());
}

function isCategoryImprovementRequest(message: string): boolean {
  return /melhorar|melhoraria|duplicad|redund|est[aã]o boas|cadastro/i.test(message);
}

export class VorcaroResponseCriticService {
  critique(input: {
    userMessage: string;
    context: VorcaroConversationContext;
    selectedIntent: VorcaroIntent;
    selectedTools: string[];
    generatedResponse: string;
  }): VorcaroResponseCritique {
    let score = 1;
    const issues: string[] = [];
    const topic = input.context.currentTopic;

    if (input.context.topicLocked && input.context.lockedIntent) {
      if (input.selectedIntent !== input.context.lockedIntent) {
        issues.push("context_switch_blocked");
        score -= 0.55;
      }
    }

    const allowed = TOPIC_ALLOWED_INTENTS[topic];
    if (allowed && !allowed.includes(input.selectedIntent)) {
      issues.push("wrong_tool_for_topic");
      score -= 0.45;
    }

    if (
      (topic === "categories" || input.context.lockedIntent === "CATEGORY_AUDIT" || input.context.lockedIntent === "CATEGORY_LIST") &&
      CASHFLOW_MARKERS.some((p) => p.test(input.generatedResponse))
    ) {
      issues.push("irrelevant_cashflow_in_category_context");
      score -= 0.5;
    }

    if (topic === "cards" && CASHFLOW_MARKERS.some((p) => p.test(input.generatedResponse))) {
      issues.push("irrelevant_cashflow_in_cards_context");
      score -= 0.5;
    }

    if (isListRequest(input.userMessage) && input.selectedIntent !== "CATEGORY_LIST" && topic === "categories") {
      issues.push("list_request_wrong_intent");
      score -= 0.4;
    }

    if (
      isListRequest(input.userMessage) &&
      /Os principais são|oportunidades de simplificação|auditoria/i.test(input.generatedResponse)
    ) {
      issues.push("list_request_too_analytical");
      score -= 0.35;
    }

    if (/\*\*FATO\*\*|\*\*IMPACTO\*\*|\*\*AÇÃO\*\*/i.test(input.generatedResponse)) {
      issues.push("robotic_fia_structure");
      score -= 0.25;
    }

    if (/confian[cç]a\s*\d+%/i.test(input.generatedResponse)) {
      issues.push("robotic_confidence_percent");
      score -= 0.2;
    }

    if (TECHNICAL_ENUM_PATTERN.test(input.generatedResponse)) {
      issues.push("technical_enum_exposed");
      score -= 0.3;
    }

    score = Math.max(0, Math.min(1, score));

    const suggestedIntent = this.suggestIntent(input.userMessage, input.context, issues);

    return {
      approved: score >= VORCARO_CRITIC_APPROVAL_THRESHOLD,
      issues,
      score,
      suggestedIntent,
    };
  }

  private suggestIntent(
    userMessage: string,
    context: VorcaroConversationContext,
    issues: string[],
  ): VorcaroIntent | undefined {
    if (context.lockedIntent && issues.includes("context_switch_blocked")) {
      return context.lockedIntent;
    }

    if (context.currentTopic === "categories") {
      if (isListRequest(userMessage)) return "CATEGORY_LIST";
      if (isCategoryImprovementRequest(userMessage) || context.conversationStage === "follow_up") {
        return "CATEGORY_AUDIT";
      }
      return "CATEGORY_AUDIT";
    }

    if (context.currentTopic === "cards") {
      return "CARD_LIST";
    }

    if (issues.includes("list_request_wrong_intent")) {
      return "CATEGORY_LIST";
    }

    return undefined;
  }
}

const TECHNICAL_ENUM_PATTERN =
  /\b(DUPLICATE_CATEGORY|DUPLICATE_SUBCATEGORY|SUPPLIER_AS_CATEGORY|OVERLAPPING_CATEGORY|INCONSISTENT_NAMING|LOW_USAGE_CATEGORY|MERGE_SUGGESTION)\b/i;
