const STOP_WORDS = new Set([
  "pag",
  "pg",
  "compra",
  "debito",
  "credito",
  "cartao",
  "the",
  "ltda",
  "sa",
  "eireli",
]);

export function normalizeMerchantText(description: string): string {
  return description
    .toUpperCase()
    .replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, " ")
    .replace(/[Cc]?\d{1,2}\/\d{1,2}/g, " ")
    .replace(/\bR\$\s*[\d.,]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function merchantTokens(description: string): string[] {
  return normalizeMerchantText(description)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token.toLowerCase()));
}

/** Similaridade Jaccard entre fornecedores (0–1). */
export function merchantSimilarity(a: string, b: string): number {
  const setA = new Set(merchantTokens(a));
  const setB = new Set(merchantTokens(b));

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function bestMerchantMatch(
  description: string,
  candidates: Array<{ keyword: string; score: number }>,
  minSimilarity = 0.45,
): { keyword: string; similarity: number; score: number } | null {
  let best: { keyword: string; similarity: number; score: number } | null = null;

  for (const candidate of candidates) {
    const similarity = merchantSimilarity(description, candidate.keyword);
    if (similarity < minSimilarity) continue;

    if (!best || similarity > best.similarity) {
      best = { keyword: candidate.keyword, similarity, score: candidate.score };
    }
  }

  return best;
}
