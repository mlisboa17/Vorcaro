import type { VorcaroIntent } from "@/modules/vorcaro/intent/domain/types/vorcaro-intent";
import type { VorcaroChatTopic } from "../types/vorcaro-conversation";

export const TOPIC_LOCK_PATTERNS: RegExp[] = [
  /melhor(e|ar|aria)/i,
  /vale a pena/i,
  /o que voc[eê] faria/i,
  /(esse|este) cadastro/i,
  /est[aá] (bom|boa|ruim|ok)/i,
  /pode melhorar/i,
  /duplicad/i,
  /redund/i,
  /confus/i,
  /organiz/i,
];

export const EXPLICIT_TOPIC_SWITCH_PATTERNS: RegExp[] = [
  /mudar de assunto/i,
  /falar de (outro|fluxo|caixa|metas|alertas)/i,
  /agora (fale|me fale|quero saber) (sobre|de)/i,
  /^\/(alertas|recebiveis|metas|gastos|status)\b/i,
];

const TOPIC_TO_DEFAULT_INTENT: Partial<Record<VorcaroChatTopic, VorcaroIntent>> = {
  categories: "CATEGORY_AUDIT",
  cards: "CARD_LIST",
  cashflow: "CASHFLOW",
  health: "HEALTH_SCORE",
  goals: "GOALS",
  receivables: "RECEIVABLES",
  commitments: "COMMITMENTS",
  alerts: "ALERTS",
  savings: "MONEY_LEAK",
  timeline: "TIMELINE",
  evolution: "EVOLUTION",
  achievements: "ACHIEVEMENTS",
  trends: "TRENDS",
  followups: "FOLLOWUPS",
};

export function isTopicLockMessage(message: string): boolean {
  const text = message.trim();
  if (EXPLICIT_TOPIC_SWITCH_PATTERNS.some((p) => p.test(text))) {
    return false;
  }
  return TOPIC_LOCK_PATTERNS.some((p) => p.test(text));
}

export function resolveLockedIntent(
  topic: VorcaroChatTopic,
  message: string,
  lastIntent: VorcaroIntent | null,
): VorcaroIntent | null {
  if (topic === "general") return null;
  if (EXPLICIT_TOPIC_SWITCH_PATTERNS.some((p) => p.test(message.trim()))) {
    return null;
  }

  if (topic === "categories") {
    if (/^(mostre|liste|listar|quais|me mostre|me liste).*(categor|cadastro)/i.test(message)) {
      return "CATEGORY_LIST";
    }
    if (isTopicLockMessage(message) || lastIntent === "CATEGORY_LIST" || lastIntent === "CATEGORY_AUDIT") {
      return /melhorar|melhoraria|duplicad|redund|est[aã]o boas|cadastro/i.test(message)
        ? "CATEGORY_AUDIT"
        : (lastIntent ?? "CATEGORY_AUDIT");
    }
    return TOPIC_TO_DEFAULT_INTENT.categories ?? null;
  }

  if (topic === "cards") {
    return "CARD_LIST";
  }

  if (isTopicLockMessage(message)) {
    return TOPIC_TO_DEFAULT_INTENT[topic] ?? lastIntent;
  }

  return lastIntent ?? TOPIC_TO_DEFAULT_INTENT[topic] ?? null;
}

export function extractEntitiesMentioned(message: string, topic: VorcaroChatTopic): string[] {
  const entities: string[] = [];
  if (topic === "categories" || /categor/i.test(message)) {
    entities.push("categories");
  }
  if (topic === "cards" || /cart[oõ]/i.test(message)) {
    entities.push("cards");
  }
  return entities;
}
