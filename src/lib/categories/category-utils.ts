import type { FinanceCategory } from "@/types/inbox";
import type { ConfigCategoria } from "@/types/instruments-config";
import { normalizeCategoryName } from "./category-name-normalizer";

export interface FlatCategoryOption {
  id: string;
  label: string;
}

export function flattenCatalogCategories(
  categories: Array<
    FinanceCategory & {
      subcategorias?: Array<{ id: string; nome?: string; name?: string }>;
    }
  >,
): FlatCategoryOption[] {
  const result: FlatCategoryOption[] = [];
  const hasNested = categories.some((category) => (category.subcategorias?.length ?? 0) > 0);

  if (hasNested) {
    for (const root of categories) {
      const subcategories = root.subcategorias ?? [];

      if (subcategories.length === 0) {
        result.push({ id: root.id, label: root.name });
        continue;
      }

      for (const subcategory of subcategories) {
        const subName = subcategory.nome ?? subcategory.name ?? subcategory.id;
        result.push({
          id: subcategory.id,
          label: `${root.name} › ${subName}`,
        });
      }
    }

    return result;
  }

  const roots = categories.filter((category) => !category.parentCategoryId);

  for (const root of roots) {
    const subcategories = categories.filter((category) => category.parentCategoryId === root.id);

    if (subcategories.length === 0) {
      result.push({ id: root.id, label: root.name });
      continue;
    }

    for (const subcategory of subcategories) {
      result.push({
        id: subcategory.id,
        label: `${root.name} › ${subcategory.name}`,
      });
    }
  }

  return result;
}

export function countCategoryTreeNodes(categories: ConfigCategoria[]): number {
  return categories.reduce(
    (total, category) => total + 1 + (category.subcategorias?.length ?? 0),
    0,
  );
}

export function resolveCategoryIdFromCatalog(
  categories: FinanceCategory[],
  input: {
    categoriaPrincipal?: string | null;
    subcategoria?: string | null;
    category?: string | null;
  },
): string | null {
  const principal = normalizeCategoryName(input.categoriaPrincipal);
  const sub = normalizeCategoryName(input.subcategoria);
  const legacy = normalizeCategoryName(input.category);

  const roots = categories.filter((category) => !category.parentCategoryId);

  for (const root of roots) {
    const rootName = normalizeCategoryName(root.name);
    const subcategories = categories.filter((category) => category.parentCategoryId === root.id);

    if (sub && rootName === principal) {
      const match = subcategories.find(
        (entry) => normalizeCategoryName(entry.name) === sub,
      );

      if (match) {
        return match.id;
      }
    }

    if (!sub && rootName === principal) {
      return root.id;
    }

    if (legacy && rootName === legacy) {
      return root.id;
    }

    for (const entry of subcategories) {
      const entryName = normalizeCategoryName(entry.name);
      const combined = normalizeCategoryName(`${root.name} ${entry.name}`);
      const combinedArrow = normalizeCategoryName(`${root.name} → ${entry.name}`);

      if (entryName === legacy || combined === legacy || combinedArrow === legacy) {
        return entry.id;
      }
    }
  }

  return null;
}
