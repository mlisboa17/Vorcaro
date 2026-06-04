import { describe, expect, it } from "vitest";
import { RulesAutomationTool } from "../application/tools/rules-automation-tool";

describe("RulesAutomationTool", () => {
  it("não expõe métodos de mutação automática", () => {
    const tool = new RulesAutomationTool({ category: { findMany: async () => [] } } as never);
    expect(typeof tool.execute).toBe("function");
    expect((tool as unknown as Record<string, unknown>).createRule).toBeUndefined();
    expect((tool as unknown as Record<string, unknown>).deleteRule).toBeUndefined();
  });

  it("retorna contrato VorcaroToolResult com aviso de confirmação humana", async () => {
    const prisma = {
      category: {
        findMany: async () => [{ id: "1", name: "Alimentação", parentCategoryId: null }],
      },
    } as never;

    const tool = new RulesAutomationTool(prisma);
    Object.assign(tool, {
      listRules: {
        execute: async () => ({
          rules: [
            {
              id: "r1",
              name: "iFood",
              condition: { field: "description", operator: "contains", value: "ifood" },
              action: { set: "category", value: "Alimentação" },
              isActive: true,
            },
          ],
          patterns: [
            {
              inputSignal: { keyword: "uber" },
              outputSignal: { category: "Transporte" },
              occurrences: 4,
            },
          ],
        }),
      },
    });

    const result = await tool.execute("user-1", "Quais regras existem?");
    expect(result.intent).toBe("RULES_AUTOMATIONS");
    expect(result.facts.length).toBeGreaterThan(0);
    expect(result.recommendations.some((r) => /confirmação manual/i.test(r))).toBe(true);
  });
});
