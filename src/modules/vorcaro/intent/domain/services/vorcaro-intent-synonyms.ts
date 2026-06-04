import type { VorcaroIntent } from "../types/vorcaro-intent";

/** Expressões semanticamente equivalentes — Sprint 14.6 (M-01). */
export const INTENT_SYNONYM_RULES: Array<{ intent: VorcaroIntent; patterns: RegExp[] }> = [
  {
    intent: "FOLLOWUPS",
    patterns: [
      /tenho algo parado/i,
      /o que esqueci/i,
      /o que ainda n[aã]o resolvi/i,
      /quais pend[eê]ncias tenho/i,
    ],
  },
  {
    intent: "ALERTS",
    patterns: [
      /existe algum risco/i,
      /algo preocupante/i,
      /tenho problemas financeiros/i,
    ],
  },
  {
    intent: "STATUS",
    patterns: [
      /^como estou\??$/i,
      /resumo financeiro/i,
      /vis[aã]o geral/i,
    ],
  },
  {
    intent: "RECEIVABLES",
    patterns: [
      /receb[ií]v.*atrasad/i,
      /atrasad.*receb/i,
      /tenho receb[ií]veis atrasados/i,
    ],
  },
  {
    intent: "GOALS",
    patterns: [/quais metas est[aã]o em risco/i],
  },
];

export const STRATEGIC_ADVICE_PATTERNS: RegExp[] = [
  /como acelerar meu patrim[oô]nio/i,
  /como enriquecer mais r[aá]pido/i,
  /o que voc[eê] faria para aumentar meu patrim[oô]nio/i,
  /como melhorar minha situa[cç][aã]o financeira/i,
  /como acumular patrim[oô]nio mais rapidamente/i,
  /o que voc[eê] faria.*(acelerar|patrim[oô]nio|crescimento)/i,
  /qual comportamento financeiro.*prejudica/i,
  /qual estrat[eé]gia.*(12 meses|pr[oó]ximos meses)/i,
  /o que voc[eê] faria/i,
  /no meu lugar/i,
  /prioridade para os pr[oó]ximos meses/i,
  /estrat[eé]gia/i,
  /analise aberta/i,
  /me ajude a planejar/i,
];

export function matchesStrategicAdvice(text: string): boolean {
  return STRATEGIC_ADVICE_PATTERNS.some((p) => p.test(text));
}
