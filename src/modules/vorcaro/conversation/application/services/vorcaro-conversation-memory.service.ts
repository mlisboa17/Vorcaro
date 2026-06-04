import type { VorcaroMessageRecord } from "../../domain/types/vorcaro-conversation";
import {
  VORCARO_CHAT_MAX_HISTORY_FOR_LLM,
  type VorcaroChatTopic,
} from "../../domain/types/vorcaro-conversation";

const TOPIC_PATTERNS: Array<{ topic: VorcaroChatTopic; patterns: RegExp[] }> = [
  { topic: "cashflow", patterns: [/fluxo de caixa/i, /\bcaixa\b/i, /saldo projetado/i, /ficar negativo/i] },
  { topic: "health", patterns: [/sa[uú]de financeira/i, /como estou/i, /situa[cç][aã]o financeira/i] },
  { topic: "goals", patterns: [/meta/i, /metas/i, /objetivo/i, /patrim[oô]nio/i] },
  { topic: "receivables", patterns: [/receb[ií]v/i, /reembolso/i, /devedor/i] },
  { topic: "commitments", patterns: [/compromiss/i, /recorrent/i, /assinatur/i, /parcel/i] },
  { topic: "alerts", patterns: [/alerta/i, /risco/i, /resolver hoje/i, /prioridade/i] },
  { topic: "savings", patterns: [/econom/i, /delivery/i, /desperd/i, /perdendo dinheiro/i, /vazamento/i] },
  { topic: "patrimony", patterns: [/patrim[oô]nio/i, /invest/i, /ativo/i, /passivo/i] },
];

const CONTINUATION_PATTERNS = [
  /^e no pr[oó]ximo/i,
  /^e isso/i,
  /^continua/i,
  /^e quanto/i,
  /^e em/i,
  /^e na/i,
  /^e no/i,
  /^e para/i,
  /^e se/i,
];

export class VorcaroConversationMemoryService {
  detectTopic(message: string, previousTopic?: string | null): VorcaroChatTopic {
    const trimmed = message.trim();
    if (previousTopic && this.isContinuation(trimmed)) {
      return previousTopic as VorcaroChatTopic;
    }

    for (const entry of TOPIC_PATTERNS) {
      if (entry.patterns.some((p) => p.test(trimmed))) return entry.topic;
    }
    return "general";
  }

  isContinuation(message: string): boolean {
    return CONTINUATION_PATTERNS.some((p) => p.test(message.trim()));
  }

  buildHistoryBlock(messages: VorcaroMessageRecord[], limit = VORCARO_CHAT_MAX_HISTORY_FOR_LLM): string {
    const recent = messages.slice(-limit);
    if (recent.length === 0) return "";

    return recent
      .map((m) => {
        const label = m.role === "USER" ? "Usuário" : m.role === "VORCARO" ? "Vorcaro" : "Sistema";
        return `${label}: ${m.content}`;
      })
      .join("\n\n");
  }

  inferTitle(firstMessage: string): string {
    const clean = firstMessage.trim().slice(0, 80);
    return clean.length > 0 ? clean : "Conversa Vorcaro";
  }
}
