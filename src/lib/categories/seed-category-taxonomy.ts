import type { CategoryType, PrismaClient } from "@prisma/client";
import { normalizeCategoryName } from "./category-name-normalizer";
import {
  VORCARO_CATEGORY_TAXONOMY,
  type CategoryTaxonomyEntry,
} from "./vorcaro-category-taxonomy";

export type CategorySeedRecord = {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  parentCategoryId: string | null;
  isActive: boolean;
};

export type SeedCategoryTaxonomyReport = {
  categoriesCreated: number;
  categoriesReused: number;
  subcategoriesCreated: number;
  subcategoriesReused: number;
};

export function findRootCategoryByNormalizedName(
  categories: readonly CategorySeedRecord[],
  normalizedName: string,
): CategorySeedRecord | undefined {
  return categories.find(
    (category) =>
      category.parentCategoryId === null &&
      normalizeCategoryName(category.name) === normalizedName,
  );
}

export function findSubCategoryByNormalizedName(
  categories: readonly CategorySeedRecord[],
  parentId: string,
  normalizedName: string,
): CategorySeedRecord | undefined {
  return categories.find(
    (category) =>
      category.parentCategoryId === parentId &&
      normalizeCategoryName(category.name) === normalizedName,
  );
}

export async function applyCategoryTaxonomy(
  userId: string,
  taxonomy: readonly CategoryTaxonomyEntry[],
  deps: {
    loadCategories: (userId: string) => Promise<CategorySeedRecord[]>;
    createRoot: (input: {
      userId: string;
      name: string;
      type: CategoryType;
    }) => Promise<CategorySeedRecord>;
    createSub: (input: {
      userId: string;
      parentCategoryId: string;
      name: string;
      type: CategoryType;
    }) => Promise<CategorySeedRecord>;
  },
): Promise<SeedCategoryTaxonomyReport> {
  const report: SeedCategoryTaxonomyReport = {
    categoriesCreated: 0,
    categoriesReused: 0,
    subcategoriesCreated: 0,
    subcategoriesReused: 0,
  };

  let categories = await deps.loadCategories(userId);

  for (const entry of taxonomy) {
    const normalizedRoot = normalizeCategoryName(entry.name);
    let root = findRootCategoryByNormalizedName(categories, normalizedRoot);

    if (root) {
      report.categoriesReused += 1;
    } else {
      root = await deps.createRoot({
        userId,
        name: entry.name,
        type: entry.type,
      });
      categories = [...categories, root];
      report.categoriesCreated += 1;
    }

    for (const childName of entry.children) {
      const normalizedChild = normalizeCategoryName(childName);
      const existingChild = findSubCategoryByNormalizedName(
        categories,
        root.id,
        normalizedChild,
      );

      if (existingChild) {
        report.subcategoriesReused += 1;
        continue;
      }

      const created = await deps.createSub({
        userId,
        parentCategoryId: root.id,
        name: childName,
        type: entry.type,
      });
      categories = [...categories, created];
      report.subcategoriesCreated += 1;
    }
  }

  return report;
}

export async function seedCategoryTaxonomyForUser(
  db: PrismaClient,
  userId: string,
  taxonomy: readonly CategoryTaxonomyEntry[] = VORCARO_CATEGORY_TAXONOMY,
): Promise<SeedCategoryTaxonomyReport> {
  return applyCategoryTaxonomy(userId, taxonomy, {
    loadCategories: async (ownerId) =>
      db.category.findMany({
        where: { userId: ownerId },
        select: {
          id: true,
          userId: true,
          name: true,
          type: true,
          parentCategoryId: true,
          isActive: true,
        },
      }),
    createRoot: async ({ userId: ownerId, name, type }) =>
      db.category.create({
        data: {
          userId: ownerId,
          name,
          type,
          parentCategoryId: null,
          isSystem: true,
          isActive: true,
        },
        select: {
          id: true,
          userId: true,
          name: true,
          type: true,
          parentCategoryId: true,
          isActive: true,
        },
      }),
    createSub: async ({ userId: ownerId, parentCategoryId, name, type }) =>
      db.category.create({
        data: {
          userId: ownerId,
          name,
          type,
          parentCategoryId,
          isSystem: true,
          isActive: true,
        },
        select: {
          id: true,
          userId: true,
          name: true,
          type: true,
          parentCategoryId: true,
          isActive: true,
        },
      }),
  });
}

export function formatSeedCategoryTaxonomyReport(report: SeedCategoryTaxonomyReport): string {
  return [
    `Categorias criadas: ${report.categoriesCreated}`,
    `Categorias reutilizadas: ${report.categoriesReused}`,
    `Subcategorias criadas: ${report.subcategoriesCreated}`,
    `Subcategorias reutilizadas: ${report.subcategoriesReused}`,
  ].join("\n");
}
