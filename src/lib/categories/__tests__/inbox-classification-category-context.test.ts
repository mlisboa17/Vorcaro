import { describe, expect, it } from "vitest";
import {
  buildInboxClassificationCategoryContext,
  resolveCategoryIdByNormalizedNames,
} from "../inbox-classification-category-context";

describe("buildInboxClassificationCategoryContext", () => {
  it("monta árvore principal > subcategorias", () => {
    const context = buildInboxClassificationCategoryContext([
      { id: "1", name: "Alimentação", parentCategoryId: null },
      { id: "2", name: "Mercado", parentCategoryId: "1" },
      { id: "3", name: "Restaurantes", parentCategoryId: "1" },
    ]);

    expect(context).toContain("Alimentação:");
    expect(context).toContain("• Mercado");
    expect(context).toContain("• Restaurantes");
  });

  it("inclui exemplos de histórico quando informados", () => {
    const context = buildInboxClassificationCategoryContext(
      [{ id: "1", name: "Transporte", parentCategoryId: null }],
      [{ keyword: "shell", categoryName: "Transporte → Combustível", occurrences: 4 }],
    );

    expect(context).toContain('"shell" → Transporte → Combustível (4x)');
  });
});

describe("resolveCategoryIdByNormalizedNames", () => {
  it("resolve subcategoria ignorando acentos", () => {
    const categories = [
      { id: "root", name: "Saúde", parentCategoryId: null },
      { id: "sub", name: "Farmácia", parentCategoryId: "root" },
    ];

    expect(resolveCategoryIdByNormalizedNames(categories, "SAUDE", "farmacia")).toBe("sub");
  });
});
