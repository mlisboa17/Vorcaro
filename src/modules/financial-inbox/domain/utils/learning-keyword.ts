const STOP_WORDS = new Set([
  "pagamento",
  "compra",
  "paguei",
  "gastei",
  "recebi",
  "no",
  "na",
  "de",
  "da",
  "do",
  "em",
  "por",
  "para",
  "com",
  "reais",
  "real",
  "brl",
]);

export function extractLearningKeyword(description: string): string {
  const normalized = description.trim().toLowerCase();

  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

  return tokens[0] ?? normalized.slice(0, 32);
}
