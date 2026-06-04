import { normalizeMerchantText } from "../subscription-brands";

export type CanonicalSubscription = {
  normalizedName: string;
  patterns: string[];
};

/** Dicionário inicial de serviços conhecidos (rótulo canônico). */
export const CANONICAL_SUBSCRIPTIONS: CanonicalSubscription[] = [
  { normalizedName: "Netflix", patterns: ["netflix", "entret", "entertain"] },
  { normalizedName: "Spotify", patterns: ["spotify", "sfty spotify"] },
  {
    normalizedName: "Amazon Prime",
    patterns: ["amazon prime", "amzn prime", "amzn pr", "prime video", "primevideo"],
  },
  { normalizedName: "Disney+", patterns: ["disney", "disneyplus", "disney plus"] },
  { normalizedName: "Max", patterns: [" hbo ", "hbo max", " max ", "warner"] },
  { normalizedName: "YouTube Premium", patterns: ["youtube premium", "youtube prem", "yt premium"] },
  { normalizedName: "Google One", patterns: ["google one", "google*one", "google storage"] },
  { normalizedName: "Microsoft 365", patterns: ["microsoft 365", "office 365", "ms 365"] },
  { normalizedName: "Apple One", patterns: ["apple one", "apple.com bill", "apple com bill", "icloud"] },
];

const PREFIX_SUFFIX_REGEX = [
  /^[A-Z]{2,6}\*/i,
  /\*[A-Z0-9]+\s*$/i,
  /\s+\d{4,}$/,
  /GOOGLE\*/gi,
  /APPLE\.COM/gi,
  /PAYPAL\s*\*/gi,
  /RENE\*/gi,
  /SFTY\*/gi,
];

export class SubscriptionNameNormalizer {
  constructor(private readonly catalog: CanonicalSubscription[] = CANONICAL_SUBSCRIPTIONS) {}

  /** Limpa descrição suja de cartão/extrato e retorna nome canônico ou null. */
  normalize(description: string): string | null {
    let cleaned = description.trim();
    for (const re of PREFIX_SUFFIX_REGEX) {
      cleaned = cleaned.replace(re, " ");
    }
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    const norm = normalizeMerchantText(cleaned);
    if (!norm) return null;

    for (const entry of this.catalog) {
      if (entry.patterns.some((p) => norm.includes(p.replace(/\s+/g, " ")))) {
        return entry.normalizedName;
      }
    }

    return this.matchBySimilarity(norm);
  }

  /** Agrupa chave estável para duplicateGroup (slug do nome canônico). */
  toDuplicateGroup(normalizedName: string): string {
    return normalizedName
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private matchBySimilarity(norm: string): string | null {
    let best: { name: string; score: number } | null = null;

    for (const entry of this.catalog) {
      const key = normalizeMerchantText(entry.normalizedName);
      const score = this.similarityScore(norm, key);
      if (score >= 0.72 && (!best || score > best.score)) {
        best = { name: entry.normalizedName, score };
      }
      for (const p of entry.patterns) {
        const ps = this.similarityScore(norm, p);
        if (ps >= 0.8 && (!best || ps > best.score)) {
          best = { name: entry.normalizedName, score: ps };
        }
      }
    }

    return best?.name ?? null;
  }

  private similarityScore(a: string, b: string): number {
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.85;
    const aTokens = new Set(a.split(" ").filter(Boolean));
    const bTokens = new Set(b.split(" ").filter(Boolean));
    let inter = 0;
    for (const t of aTokens) {
      if (bTokens.has(t)) inter++;
    }
    const union = aTokens.size + bTokens.size - inter;
    return union > 0 ? inter / union : 0;
  }
}
