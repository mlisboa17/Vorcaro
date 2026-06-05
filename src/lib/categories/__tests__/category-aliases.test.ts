import { describe, expect, it } from "vitest";
import { resolveCategoryAlias } from "../category-aliases";
import { VORCARO_CATEGORY_TAXONOMY } from "../vorcaro-category-taxonomy";
import { normalizeCategoryName } from "../category-name-normalizer";

describe("category-aliases", () => {
  it("resolve aliases usados em regras legadas", () => {
    expect(resolveCategoryAlias("Supermercado")).toBe("mercado");
    expect(resolveCategoryAlias("iFood")).toBe("delivery");
    expect(resolveCategoryAlias("Remédios")).toBe("farmacia");
  });
});

describe("VORCARO_CATEGORY_TAXONOMY Sprint 14.8", () => {
  it("inclui categorias raiz obrigatórias", () => {
    const roots = VORCARO_CATEGORY_TAXONOMY.map((e) => e.name);
    for (const required of [
      "Receita",
      "Moradia",
      "Alimentação",
      "Transporte",
      "Saúde",
      "Educação",
      "Lazer",
      "Financeiro",
      "Investimentos",
      "Impostos",
      "Tecnologia e Serviços Digitais",
      "Pets",
    ]) {
      expect(roots).toContain(required);
    }
  });

  it("inclui subcategorias de receita exigidas", () => {
    const receita = VORCARO_CATEGORY_TAXONOMY.find((e) => e.name === "Receita");
    const subs = new Set(receita?.children.map((c) => normalizeCategoryName(c)));
    for (const required of ["salario", "pro-labore", "comissao", "freelance", "reembolso"]) {
      expect(subs.has(required)).toBe(true);
    }
  });

  it("mantém subcategorias usadas pelas regras padrão", () => {
    const allSubs = new Set(
      VORCARO_CATEGORY_TAXONOMY.flatMap((e) => e.children.map((c) => normalizeCategoryName(c))),
    );
    for (const required of ["streaming", "inteligencia artificial", "delivery", "uber e aplicativos", "mercado"]) {
      expect(allSubs.has(required)).toBe(true);
    }
  });
});
