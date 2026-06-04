import { describe, expect, it } from "vitest";
import { VORCARO_TEMPLATE_CATEGORIES } from "../domain/types/vorcaro-personality";
import { VORCARO_TEMPLATE_LIBRARY } from "../domain/vorcaro-template-library";

describe("VorcaroTemplateLibrary", () => {
  it("possui 8 templates por categoria mínima", () => {
    for (const category of VORCARO_TEMPLATE_CATEGORIES) {
      const count = VORCARO_TEMPLATE_LIBRARY.filter((t) => t.category === category).length;
      expect(count).toBeGreaterThanOrEqual(8);
    }
  });

  it("possui dezenas de templates no total", () => {
    expect(VORCARO_TEMPLATE_LIBRARY.length).toBeGreaterThanOrEqual(112);
  });
});
