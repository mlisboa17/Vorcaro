import type { CategoryConfigRecord } from "../ports/category-config.port";

function normalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function resolveCategoryIdFromNames(
  categories: CategoryConfigRecord[],
  input: {
    categoriaPrincipal?: string | null;
    subcategoria?: string | null;
    category?: string | null;
  },
): string | null {
  const principal = normalizeName(input.categoriaPrincipal);
  const sub = normalizeName(input.subcategoria);
  const legacy = normalizeName(input.category);

  if (sub) {
    const parent = categories.find(
      (category) => !category.parentCategoryId && normalizeName(category.name) === principal,
    );

    if (parent) {
      const match = categories.find(
        (category) =>
          category.parentCategoryId === parent.id && normalizeName(category.name) === sub,
      );

      if (match) {
        return match.id;
      }
    }
  }

  if (principal) {
    const rootMatch = categories.find(
      (category) => !category.parentCategoryId && normalizeName(category.name) === principal,
    );

    if (rootMatch) {
      return rootMatch.id;
    }
  }

  if (legacy) {
    const directMatch = categories.find((category) => normalizeName(category.name) === legacy);

    if (directMatch) {
      return directMatch.id;
    }

    for (const category of categories) {
      if (!category.parentCategoryId) {
        continue;
      }

      const parent = categories.find((entry) => entry.id === category.parentCategoryId);
      const combined = normalizeName(`${parent?.name ?? ""} ${category.name}`);
      const combinedArrow = normalizeName(`${parent?.name ?? ""} → ${category.name}`);

      if (combined === legacy || combinedArrow === legacy) {
        return category.id;
      }
    }
  }

  return null;
}
