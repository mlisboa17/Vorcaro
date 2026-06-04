import type { VorcaroIntent, VorcaroIntentDetection } from "../../domain/types/vorcaro-intent";

const INTENT_RULES: Array<{ intent: VorcaroIntent; patterns: RegExp[] }> = [
  {
    intent: "RULES_AUTOMATIONS",
    patterns: [
      /regra/i,
      /automa[cç][aã]o/i,
      /classificad/i,
      /padr[aã]o aprendido/i,
      /ia aprendeu/i,
      /mem[oó]ria do sistema/i,
      /c[eé]rebro/i,
    ],
  },
  {
    intent: "ALERTS",
    patterns: [/alerta/i, /urgente/i, /cr[ií]tico/i, /resolver hoje/i, /prioridade hoje/i],
  },
  {
    intent: "RECEIVABLES",
    patterns: [/receb[ií]v/i, /devendo/i, /reembolso/i, /devedor/i, /atrasad/i],
  },
  {
    intent: "GOALS",
    patterns: [/meta/i, /atingir minha meta/i, /objetivo financeiro/i],
  },
  {
    intent: "CASHFLOW",
    patterns: [/fluxo de caixa/i, /\bcaixa\b/i, /ficar negativo/i, /saldo projetado/i, /pr[oó]ximo m[eê]s/i],
  },
  {
    intent: "COMMITMENTS",
    patterns: [/compromiss/i, /recorrent/i, /parcelamento/i, /fatura/i],
  },
  {
    intent: "SUBSCRIPTIONS",
    patterns: [/assinatur/i, /streaming/i, /cancelar.*servi/i, /duplicad/i],
  },
  {
    intent: "MONEY_LEAK",
    patterns: [/perdendo dinheiro/i, /vazamento/i, /money leak/i, /gastos invis/i, /desperd/i],
  },
  {
    intent: "EXPENSES",
    patterns: [/gastando mais/i, /onde estou gastando/i, /delivery/i, /despesa/i],
  },
  {
    intent: "NOTIFICATIONS",
    patterns: [/notifica[cç][aã]/i, /avisos/i, /central de notifica/i],
  },
  {
    intent: "HEALTH_SCORE",
    patterns: [/sa[uú]de financeira/i, /score financeiro/i],
  },
  {
    intent: "STATUS",
    patterns: [
      /como estou financeiramente/i,
      /situa[cç][aã]o financeira/i,
      /situa[cç][aã]o melhorou/i,
      /como estou/i,
      /^\/status\b/i,
    ],
  },
];

const LLM_REQUIRED_PATTERNS = [
  /o que voc[eê] faria/i,
  /no meu lugar/i,
  /como melhorar minha situa[cç][aã]o/i,
  /prioridade para os pr[oó]ximos meses/i,
  /estrat[eé]gia/i,
  /compar(e|ar)/i,
  /analise aberta/i,
  /me ajude a planejar/i,
];

const TOPIC_TO_INTENT: Record<string, VorcaroIntent> = {
  cashflow: "CASHFLOW",
  health: "HEALTH_SCORE",
  goals: "GOALS",
  receivables: "RECEIVABLES",
  commitments: "COMMITMENTS",
  alerts: "ALERTS",
  savings: "MONEY_LEAK",
  patrimony: "GOALS",
  general: "GENERAL_CHAT",
};

const STATUS_BUNDLE: VorcaroIntent[] = [
  "HEALTH_SCORE",
  "ALERTS",
  "GOALS",
  "MONEY_LEAK",
  "COMMITMENTS",
];

export class VorcaroIntentEngineService {
  detect(message: string, activeTopic?: string | null): VorcaroIntentDetection {
    const text = message.trim();
    const requiresLlm = LLM_REQUIRED_PATTERNS.some((p) => p.test(text));

    if (/^\/(alertas|recebiveis|metas|gastos|oportunidades|status)\b/i.test(text)) {
      const cmd = text.toLowerCase();
      if (cmd.startsWith("/alertas")) return this.build("ALERTS", [], requiresLlm);
      if (cmd.startsWith("/recebiveis")) return this.build("RECEIVABLES", [], requiresLlm);
      if (cmd.startsWith("/metas")) return this.build("GOALS", [], requiresLlm);
      if (cmd.startsWith("/gastos")) return this.build("EXPENSES", [], requiresLlm);
      if (cmd.startsWith("/oportunidades")) return this.build("MONEY_LEAK", ["SUBSCRIPTIONS"], requiresLlm);
      if (cmd.startsWith("/status")) return this.build("STATUS", STATUS_BUNDLE, requiresLlm);
    }

    let best: VorcaroIntent = "UNKNOWN";
    let bestScore = 0;

    for (const rule of INTENT_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(text)) {
          best = rule.intent;
          bestScore = Math.max(bestScore, 2);
        }
      }
    }

    if (best === "UNKNOWN" && activeTopic) {
      best = TOPIC_TO_INTENT[activeTopic] ?? "UNKNOWN";
      bestScore = best === "UNKNOWN" ? 0 : 1;
    }

    if (/^(e |continua|e no |e na |e em )/i.test(text) && activeTopic) {
      best = TOPIC_TO_INTENT[activeTopic] ?? best;
      bestScore = Math.max(bestScore, 1);
    }

    const related =
      best === "STATUS"
        ? STATUS_BUNDLE
        : best === "MONEY_LEAK"
          ? (["SUBSCRIPTIONS"] as VorcaroIntent[])
          : [];

    if (best === "UNKNOWN" && !requiresLlm) {
      return this.build("GENERAL_CHAT", [], true);
    }

    return this.build(best, related, requiresLlm || best === "GENERAL_CHAT", bestScore);
  }

  private build(
    primary: VorcaroIntent,
    related: VorcaroIntent[],
    requiresLlm: boolean,
    confidence = 2,
  ): VorcaroIntentDetection {
    return { primary, related, requiresLlm, confidence };
  }
}
