import type { CategoryConfigRecord } from "../ports/category-config.port";
import { normalizeCategoryName } from "@/lib/categories/category-name-normalizer";

export function resolveCategoryIdFromNames(
  categories: CategoryConfigRecord[],
  input: {
    categoriaPrincipal?: string | null;
    subcategoria?: string | null;
    category?: string | null;
  },
): string | null {
  const principal = normalizeCategoryName(input.categoriaPrincipal);
  const sub = normalizeCategoryName(input.subcategoria);
  const legacy = normalizeCategoryName(input.category);

  if (sub) {
    const parent = categories.find(
      (category) =>
        !category.parentCategoryId && normalizeCategoryName(category.name) === principal,
    );

    if (parent) {
      const match = categories.find(
        (category) =>
          category.parentCategoryId === parent.id &&
          normalizeCategoryName(category.name) === sub,
      );

      if (match) {
        return match.id;
      }
    }
  }

  if (principal) {
    const rootMatch = categories.find(
      (category) =>
        !category.parentCategoryId && normalizeCategoryName(category.name) === principal,
    );

    if (rootMatch) {
      return rootMatch.id;
    }
  }

  if (legacy) {
    const directMatch = categories.find(
      (category) => normalizeCategoryName(category.name) === legacy,
    );

    if (directMatch) {
      return directMatch.id;
    }

    for (const category of categories) {
      if (!category.parentCategoryId) {
        continue;
      }

      const parent = categories.find((entry) => entry.id === category.parentCategoryId);
      const combined = normalizeCategoryName(`${parent?.name ?? ""} ${category.name}`);
      const combinedArrow = normalizeCategoryName(`${parent?.name ?? ""} → ${category.name}`);

      if (combined === legacy || combinedArrow === legacy) {
        return category.id;
      }
    }
  }

  return null;
}
