import type { FinanceCategory } from "@/types/inbox";
import type { ConfigCategoria } from "@/types/instruments-config";

export interface FlatCategoryOption {
  id: string;
  label: string;
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
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
  const principal = normalizeName(input.categoriaPrincipal);
  const sub = normalizeName(input.subcategoria);
  const legacy = normalizeName(input.category);

  const roots = categories.filter((category) => !category.parentCategoryId);

  for (const root of roots) {
    const rootName = normalizeName(root.name);
    const subcategories = categories.filter((category) => category.parentCategoryId === root.id);

    if (sub && rootName === principal) {
      const match = subcategories.find((entry) => normalizeName(entry.name) === sub);

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
      const entryName = normalizeName(entry.name);
      const combined = normalizeName(`${root.name} ${entry.name}`);
      const combinedArrow = normalizeName(`${root.name} → ${entry.name}`);

      if (entryName === legacy || combined === legacy || combinedArrow === legacy) {
        return entry.id;
      }
    }
  }

  return null;
}
