/** Marcas conhecidas para detecção de assinaturas duplicadas. */
export const SUBSCRIPTION_BRAND_KEYWORDS = [
  "netflix",
  "spotify",
  "amazon prime",
  "prime video",
  "disney",
  "disney+",
  "max",
  "hbo",
  "youtube premium",
  "google one",
  "microsoft 365",
  "office 365",
  "apple one",
  "icloud",
  "deezer",
  "paramount",
  "crunchyroll",
  "globoplay",
  "claro tv",
] as const;

export function normalizeMerchantText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchSubscriptionBrand(description: string): string | null {
  const norm = normalizeMerchantText(description);
  for (const brand of SUBSCRIPTION_BRAND_KEYWORDS) {
    if (norm.includes(brand)) return brand;
  }
  return null;
}
