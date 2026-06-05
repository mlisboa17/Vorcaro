import { describe, expect, it } from "vitest";
import { CategoryAuditTool } from "../application/tools/category-audit-tool";

const TECHNICAL_ENUM_PATTERN =
  /DUPLICATE_CATEGORY|SUPPLIER_AS_CATEGORY|OVERLAPPING_CATEGORY|MERGE_SUGGESTION|severity|confidence/i;
const CONFIDENCE_PATTERN = /confian[cç]a\s*\d+%/i;

const mockReport = {
  findings: [
    {
      type: "SUPPLIER_AS_CATEGORY" as const,
      severity: "HIGH" as const,
      title: "Fornecedor",
      description: "iFood",
      currentItems: ["iFood"],
      suggestedAction: "Sugestão: mover para Delivery.",
      confidence: 0.94,
    },
    {
      type: "SUPPLIER_AS_CATEGORY" as const,
      severity: "HIGH" as const,
      title: "Fornecedor",
      description: "Uber",
      currentItems: ["Uber"],
      suggestedAction: "Sugestão: mover para Transporte.",
      confidence: 0.93,
    },
  ],
  summary: { totalFindings: 2, high: 2, medium: 0, low: 0 },
  suggestedMerges: [],
  supplierLikeCategories: ["iFood", "Uber"],
  lowUsageCategories: [],
  healthScore: { score: 84, label: "Boa" as const },
  topImprovements: [
    {
      id: "improvement-1",
      priority: "high" as const,
      title: "Empresas cadastradas como categoria",
      description: "iFood, Uber",
      impactLabel: "Análises por tipo de gasto ficam inconsistentes",
      items: ["iFood", "Uber"],
      findingType: "SUPPLIER_AS_CATEGORY" as const,
    },
  ],
};

describe("CategoryAuditTool", () => {
  it("não expõe métodos de mutação automática", () => {
    const tool = new CategoryAuditTool({} as never);
    expect(typeof tool.execute).toBe("function");
    expect((tool as unknown as Record<string, unknown>).renameCategory).toBeUndefined();
    expect((tool as unknown as Record<string, unknown>).mergeCategories).toBeUndefined();
  });

  it("retorna resposta consultiva sem termos técnicos internos", async () => {
    const tool = new CategoryAuditTool({} as never);
    Object.assign(tool, {
      auditService: {
        audit: async () => mockReport,
      },
    });

    const result = await tool.execute("user-1", "Minhas categorias estão boas?");
    expect(result.intent).toBe("CATEGORY_AUDIT");
    expect(result.summary).not.toMatch(TECHNICAL_ENUM_PATTERN);
    expect(result.summary).not.toMatch(CONFIDENCE_PATTERN);
    expect(result.summary).toMatch(/empresas|aplicativos|nota \d+\/100/i);
    expect(result.facts.length).toBeLessThanOrEqual(5);
    expect(result.recommendations.some((r) => /confirmação|automaticamente/i.test(r))).toBe(true);
    expect(result.suggestedActions).toBeUndefined();
    expect(result.metrics.healthScore).toBe(84);
  });

  it("Pode melhorar esse cadastro? — proposta estruturada sem abrir dashboard", async () => {
    const tool = new CategoryAuditTool({} as never);
    Object.assign(tool, {
      auditService: {
        audit: async () => mockReport,
      },
    });

    const result = await tool.execute("user-1", "Pode melhorar esse cadastro?");
    expect(result.summary).toMatch(/Deseja visualizar a proposta/i);
    expect(result.summary).not.toMatch(TECHNICAL_ENUM_PATTERN);
    expect(result.suggestedActions).toBeUndefined();
  });

  it("abre dashboard apenas quando usuário pede visualização", async () => {
    const tool = new CategoryAuditTool({} as never);
    Object.assign(tool, {
      auditService: {
        audit: async () => mockReport,
      },
    });

    const result = await tool.execute("user-1", "Quero visualizar a proposta detalhada");
    expect(result.suggestedActions?.[0]?.type).toBe("OPEN_DASHBOARD_SECTION");
  });
});
