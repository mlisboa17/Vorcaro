import { describe, expect, it } from "vitest";
import {
  categoryNamesMatch,
  normalizeCategoryName,
} from "../category-name-normalizer";

describe("normalizeCategoryName", () => {
  it("ignora maiúsculas, acentos e espaços extras", () => {
    expect(normalizeCategoryName("  SAÚDE  ")).toBe("saude");
    expect(normalizeCategoryName("saude")).toBe("saude");
    expect(categoryNamesMatch("Saúde", "SAUDE")).toBe(true);
  });

  it("colapsa espaços duplicados", () => {
    expect(normalizeCategoryName("Família   e   Filhos")).toBe("familia e filhos");
  });
});
