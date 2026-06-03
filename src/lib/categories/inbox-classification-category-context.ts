import { normalizeCategoryName } from "./category-name-normalizer";

export type CategoryTreeRow = {
  id: string;
  name: string;
  parentCategoryId: string | null;
};

export type CategoryHistoryHint = {
  keyword: string;
  categoryName: string;
  occurrences: number;
};

/** Monta árvore de categorias + exemplos de histórico para prompt da Inbox Intelligence. */
export function buildInboxClassificationCategoryContext(
  categories: readonly CategoryTreeRow[],
  historyHints: readonly CategoryHistoryHint[] = [],
): string {
  const roots = categories
    .filter((category) => !category.parentCategoryId)
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));

  const lines: string[] = ["Taxonomia do usuário (categoria > subcategorias):"];

  for (const root of roots) {
    const subs = categories
      .filter((category) => category.parentCategoryId === root.id)
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));

    if (subs.length === 0) {
      lines.push(`- ${root.name}`);
      continue;
    }

    lines.push(`- ${root.name}:`);
    for (const sub of subs) {
      lines.push(`  • ${sub.name}`);
    }
  }

  if (historyHints.length > 0) {
    lines.push("", "Exemplos do histórico do usuário:");
    for (const hint of historyHints.slice(0, 8)) {
      lines.push(
        `- "${hint.keyword}" → ${hint.categoryName} (${hint.occurrences}x)`,
      );
    }
  }

  return lines.join("\n");
}

export function resolveCategoryIdByNormalizedNames(
  categories: readonly CategoryTreeRow[],
  categoriaPrincipal: string | null | undefined,
  subcategoria: string | null | undefined,
): string | null {
  const principalNorm = normalizeCategoryName(categoriaPrincipal);
  if (!principalNorm) return null;

  const parent = categories.find(
    (category) =>
      !category.parentCategoryId && normalizeCategoryName(category.name) === principalNorm,
  );

  if (!parent) return null;

  const subNorm = normalizeCategoryName(subcategoria);
  if (!subNorm) return parent.id;

  const sub = categories.find(
    (category) =>
      category.parentCategoryId === parent.id &&
      normalizeCategoryName(category.name) === subNorm,
  );

  return sub?.id ?? parent.id;
}
