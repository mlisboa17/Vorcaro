import { CategoryType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  applyCategoryTaxonomy,
  findRootCategoryByNormalizedName,
  findSubCategoryByNormalizedName,
} from "../seed-category-taxonomy";
import type { CategorySeedRecord } from "../seed-category-taxonomy";

function record(
  partial: Partial<CategorySeedRecord> & Pick<CategorySeedRecord, "id" | "name">,
): CategorySeedRecord {
  return {
    userId: "user-1",
    type: CategoryType.DESPESA,
    parentCategoryId: null,
    isActive: true,
    ...partial,
  };
}

describe("applyCategoryTaxonomy", () => {
  it("reutiliza categoria equivalente sem duplicar", async () => {
    const store: CategorySeedRecord[] = [
      record({ id: "root-saude", name: "SAUDE", type: CategoryType.DESPESA }),
    ];

    const report = await applyCategoryTaxonomy(
      "user-1",
      [{ name: "Saúde", type: CategoryType.DESPESA, children: ["Farmácia"] }],
      {
        loadCategories: async () => [...store],
        createRoot: async ({ name, type, userId }) => {
          const created = record({
            id: `new-${store.length}`,
            name,
            type,
            userId,
          });
          store.push(created);
          return created;
        },
        createSub: async ({ name, type, userId, parentCategoryId }) => {
          const created = record({
            id: `sub-${store.length}`,
            name,
            type,
            userId,
            parentCategoryId,
          });
          store.push(created);
          return created;
        },
      },
    );

    expect(report.categoriesReused).toBe(1);
    expect(report.categoriesCreated).toBe(0);
    expect(store.filter((entry) => entry.parentCategoryId === null)).toHaveLength(1);
  });

  it("reutiliza subcategoria equivalente dentro da categoria pai", async () => {
    const store: CategorySeedRecord[] = [
      record({ id: "root-food", name: "Alimentação" }),
      record({
        id: "sub-market",
        name: "Mercado",
        parentCategoryId: "root-food",
      }),
    ];

    const report = await applyCategoryTaxonomy(
      "user-1",
      [
        {
          name: "Alimentação",
          type: CategoryType.DESPESA,
          children: ["Mercado", "Padaria"],
        },
      ],
      {
        loadCategories: async () => [...store],
        createRoot: async () => {
          throw new Error("não deveria criar raiz");
        },
        createSub: async ({ name, type, userId, parentCategoryId }) => {
          const created = record({
            id: `sub-${store.length}`,
            name,
            type,
            userId,
            parentCategoryId,
          });
          store.push(created);
          return created;
        },
      },
    );

    expect(report.categoriesReused).toBe(1);
    expect(report.subcategoriesReused).toBe(1);
    expect(report.subcategoriesCreated).toBe(1);
    expect(store).toHaveLength(3);
  });

  it("cria subcategoria quando falta", async () => {
    const store: CategorySeedRecord[] = [
      record({ id: "root-transport", name: "Transporte" }),
    ];

    const report = await applyCategoryTaxonomy(
      "user-1",
      [
        {
          name: "Transporte",
          type: CategoryType.DESPESA,
          children: ["Pedágio"],
        },
      ],
      {
        loadCategories: async () => [...store],
        createRoot: async () => {
          throw new Error("não deveria criar raiz");
        },
        createSub: async ({ name, type, userId, parentCategoryId }) => {
          const created = record({
            id: "sub-toll",
            name,
            type,
            userId,
            parentCategoryId,
          });
          store.push(created);
          return created;
        },
      },
    );

    expect(report.subcategoriesCreated).toBe(1);
    expect(findSubCategoryByNormalizedName(store, "root-transport", "pedagio")?.name).toBe(
      "Pedágio",
    );
  });

  it("preserva categorias existentes fora da taxonomia", async () => {
    const store: CategorySeedRecord[] = [
      record({ id: "custom-root", name: "Minha Categoria Custom" }),
    ];

    await applyCategoryTaxonomy(
      "user-1",
      [{ name: "Pets", type: CategoryType.DESPESA, children: ["Ração"] }],
      {
        loadCategories: async () => [...store],
        createRoot: async ({ name, type, userId }) => {
          const created = record({ id: "root-pets", name, type, userId });
          store.push(created);
          return created;
        },
        createSub: async ({ name, type, userId, parentCategoryId }) => {
          const created = record({
            id: "sub-racao",
            name,
            type,
            userId,
            parentCategoryId,
          });
          store.push(created);
          return created;
        },
      },
    );

    expect(store.some((entry) => entry.name === "Minha Categoria Custom")).toBe(true);
  });

  it("é idempotente quando executado duas vezes", async () => {
    const store: CategorySeedRecord[] = [
      record({ id: "root-food", name: "Alimentação" }),
      record({ id: "sub-market", name: "Mercado", parentCategoryId: "root-food" }),
    ];

    const deps = {
      loadCategories: async () => [...store],
      createRoot: async ({ name, type, userId }: { name: string; type: CategoryType; userId: string }) => {
        const created = record({ id: `root-${store.length}`, name, type, userId });
        store.push(created);
        return created;
      },
      createSub: async ({
        name,
        type,
        userId,
        parentCategoryId,
      }: {
        name: string;
        type: CategoryType;
        userId: string;
        parentCategoryId: string;
      }) => {
        const created = record({
          id: `sub-${store.length}`,
          name,
          type,
          userId,
          parentCategoryId,
        });
        store.push(created);
        return created;
      },
    };

    const first = await applyCategoryTaxonomy(
      "user-1",
      [
        {
          name: "Alimentação",
          type: CategoryType.DESPESA,
          children: ["Mercado", "Padaria"],
        },
      ],
      deps,
    );

    const second = await applyCategoryTaxonomy(
      "user-1",
      [
        {
          name: "Alimentação",
          type: CategoryType.DESPESA,
          children: ["Mercado", "Padaria"],
        },
      ],
      deps,
    );

    expect(first.subcategoriesCreated).toBe(1);
    expect(second.subcategoriesCreated).toBe(0);
    expect(second.subcategoriesReused).toBe(2);
    expect(second.categoriesCreated).toBe(0);
  });
});

describe("findRootCategoryByNormalizedName", () => {
  it("encontra raiz por nome normalizado", () => {
    const categories = [record({ id: "1", name: "Condomínio" })];
    expect(findRootCategoryByNormalizedName(categories, "condominio")?.id).toBe("1");
  });
});
