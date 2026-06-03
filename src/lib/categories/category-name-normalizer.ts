/** Normaliza nome para comparação: sem acentos, minúsculas, trim, espaços únicos. */
export function normalizeCategoryName(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function categoryNamesMatch(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  return normalizeCategoryName(left) === normalizeCategoryName(right);
}
