import { describe, expect, it } from "vitest";
import {
  analyzeCategoryTaxonomy,
  type AuditCategoryRecord,
} from "../domain/services/category-audit-detection";
import { categoryAuditPreferenceMemory } from "@/modules/vorcaro/intent/application/services/category-audit-preference-memory.service";
import { VorcaroConsultativeResponseService } from "@/modules/vorcaro/intent/application/services/vorcaro-consultative-response.service";
import { enrichAuditReport } from "../domain/services/category-audit-health";

function cat(
  id: string,
  name: string,
  parentCategoryId: string | null = null,
  isActive = true,
): AuditCategoryRecord {
  return { id, name, parentCategoryId, isActive };
}

function buildCtx(
  categories: AuditCategoryRecord[],
  extras?: Partial<{
    ruleCategoryNames: string[];
    patternCategories: string[];
    transactionCountByCategoryId: Record<string, number>;
  }>,
) {
  return {
    categories,
    ruleCategoryNames: extras?.ruleCategoryNames ?? [],
    patternCategories: extras?.patternCategories ?? [],
    transactionCountByCategoryId: extras?.transactionCountByCategoryId ?? {},
  };
}

const TECHNICAL_PATTERN =
  /DUPLICATE_CATEGORY|SUPPLIER_AS_CATEGORY|OVERLAPPING_CATEGORY|MERGE_SUGGESTION|severity|confidence/i;
const CONFIDENCE_PATTERN = /confian[cç]a\s*\d+%/i;

describe("Sprint 14.9.3 — auditoria humanizada", () => {
  it("Caso 1: Ações, Fundos, Tesouro Direto e Criptoativos sob Investimentos NÃO são duplicados", () => {
    const investimentos = cat("root-inv", "Investimentos");
    const report = analyzeCategoryTaxonomy(
      buildCtx([
        investimentos,
        cat("sub-1", "Ações", "root-inv"),
        cat("sub-2", "Fundos", "root-inv"),
        cat("sub-3", "Tesouro Direto", "root-inv"),
        cat("sub-4", "Criptoativos", "root-inv"),
      ]),
    );

    const duplicateTypes = report.findings.filter(
      (f) => f.type === "DUPLICATE_SUBCATEGORY" || f.type === "DUPLICATE_CATEGORY",
    );
    expect(duplicateTypes).toHaveLength(0);
  });

  it("Caso 2: Aluguel e Aluguel Recebido NÃO são duplicados", () => {
    const moradia = cat("root-1", "Moradia");
    const receitas = cat("root-2", "Receitas");
    const report = analyzeCategoryTaxonomy(
      buildCtx([
        moradia,
        receitas,
        cat("sub-1", "Aluguel", "root-1"),
        cat("sub-2", "Aluguel Recebido", "root-2"),
      ]),
    );

    const duplicateTypes = report.findings.filter(
      (f) =>
        (f.type === "DUPLICATE_SUBCATEGORY" || f.type === "DUPLICATE_CATEGORY") &&
        f.currentItems.some((i) => /aluguel/i.test(i)),
    );
    expect(duplicateTypes).toHaveLength(0);
  });

  it("Caso 3: Uber vs Uber e Aplicativos gera sugestão válida", () => {
    const transporte = cat("root-1", "Transporte");
    const report = analyzeCategoryTaxonomy(
      buildCtx([
        transporte,
        cat("sub-1", "Uber", "root-1"),
        cat("sub-2", "Uber e Aplicativos", "root-1"),
      ]),
    );

    expect(
      report.findings.some(
        (f) =>
          f.type === "MERGE_SUGGESTION" ||
          f.type === "DUPLICATE_SUBCATEGORY" ||
          f.type === "INCONSISTENT_NAMING",
      ),
    ).toBe(true);
  });

  it("Caso 4: Pode melhorar esse cadastro? — resposta consultiva sem linguagem técnica", () => {
    const report = enrichAuditReport({
      findings: [
        {
          type: "SUPPLIER_AS_CATEGORY",
          severity: "HIGH",
          title: "Fornecedor",
          description: "iFood",
          currentItems: ["iFood", "Uber"],
          suggestedAction: "Mover para regras",
          confidence: 0.94,
        },
      ],
      summary: { totalFindings: 1, high: 1, medium: 0, low: 0 },
      suggestedMerges: [],
      supplierLikeCategories: ["iFood", "Uber"],
      lowUsageCategories: [],
    });

    const service = new VorcaroConsultativeResponseService();
    const response = service.format(report, {
      question: "Pode melhorar esse cadastro?",
      userId: "user-test-14.9.3",
    });

    expect(response.message).not.toMatch(TECHNICAL_PATTERN);
    expect(response.message).not.toMatch(CONFIDENCE_PATTERN);
    expect(response.message).toMatch(/O que encontrei|empresas|aplicativos/i);
    expect(response.message).toMatch(/nota \d+\/100/i);
    expect(response.message).toMatch(/Deseja visualizar a proposta/i);
    expect(response.includeDashboardAction).toBe(false);
  });

  it("memória de preferências suprime recomendação repetida", () => {
    categoryAuditPreferenceMemory.addRejection("user-mem", "Uber", "Transporte");

    const report = enrichAuditReport({
      findings: [
        {
          type: "SUPPLIER_AS_CATEGORY",
          severity: "HIGH",
          title: "Fornecedor",
          description: "Uber",
          currentItems: ["Uber"],
          suggestedAction: "Regra",
          confidence: 0.9,
        },
      ],
      summary: { totalFindings: 1, high: 1, medium: 0, low: 0 },
      suggestedMerges: [],
      supplierLikeCategories: ["Uber"],
      lowUsageCategories: [],
    });

    const service = new VorcaroConsultativeResponseService();
    const response = service.format(report, {
      question: "Auditar categorias",
      userId: "user-mem",
    });

    expect(response.recommendations.some((r) => /Uber/i.test(r.whatIFound))).toBe(false);
  });
});

describe("analyzeCategoryTaxonomy", () => {
  it("detecta Restaurante vs Restaurantes como duplicata semelhante", () => {
    const alimentacao = cat("root-1", "Alimentação");
    const report = analyzeCategoryTaxonomy(
      buildCtx([
        alimentacao,
        cat("sub-1", "Restaurante", "root-1"),
        cat("sub-2", "Restaurantes", "root-1"),
      ]),
    );

    const types = report.findings.map((f) => f.type);
    expect(types).toContain("DUPLICATE_SUBCATEGORY");
    expect(report.suggestedMerges.some((m) => m.sources.some((s) => /Restaurante/i.test(s)))).toBe(
      true,
    );
  });

  it("detecta iFood como fornecedor usado como categoria", () => {
    const report = analyzeCategoryTaxonomy(buildCtx([cat("root-1", "iFood")]));

    expect(report.findings.some((f) => f.type === "SUPPLIER_AS_CATEGORY")).toBe(true);
    expect(report.supplierLikeCategories).toContain("iFood");
  });

  it("inclui healthScore e topImprovements no report enriquecido", () => {
    const report = analyzeCategoryTaxonomy(buildCtx([cat("root-1", "iFood")]));
    expect(report.healthScore.score).toBeGreaterThanOrEqual(0);
    expect(report.healthScore.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(report.topImprovements)).toBe(true);
  });

  it("detecta Zé Delivery como fornecedor usado como categoria", () => {
    const report = analyzeCategoryTaxonomy(buildCtx([cat("root-1", "Zé Delivery")]));

    expect(report.findings.some((f) => f.type === "SUPPLIER_AS_CATEGORY")).toBe(true);
    expect(report.supplierLikeCategories.some((s) => /delivery/i.test(s))).toBe(true);
  });

  it("detecta IOF duplicado em categorias diferentes", () => {
    const financeiro = cat("root-1", "Financeiro");
    const encargos = cat("root-2", "Encargos");
    const report = analyzeCategoryTaxonomy(
      buildCtx([
        financeiro,
        encargos,
        cat("sub-1", "IOF", "root-1"),
        cat("sub-2", "IOF", "root-2"),
      ]),
    );

    expect(
      report.findings.some(
        (f) =>
          f.type === "OVERLAPPING_CATEGORY" &&
          f.currentItems.some((item) => /IOF/i.test(item)),
      ),
    ).toBe(true);
  });

  it("detecta categoria sem uso", () => {
    const report = analyzeCategoryTaxonomy(
      buildCtx([cat("root-1", "Categoria Órfã")], {
        transactionCountByCategoryId: {},
      }),
    );

    expect(report.findings.some((f) => f.type === "LOW_USAGE_CATEGORY")).toBe(true);
    expect(report.lowUsageCategories).toContain("Categoria Órfã");
  });
});

describe("CategoryTaxonomyAuditService", () => {
  it("não expõe métodos de mutação no serviço", async () => {
    const { CategoryTaxonomyAuditService } = await import(
      "../application/services/category-taxonomy-audit.service"
    );
    const service = new CategoryTaxonomyAuditService({} as never);
    expect(typeof service.audit).toBe("function");
    expect((service as unknown as Record<string, unknown>).mergeCategories).toBeUndefined();
    expect((service as unknown as Record<string, unknown>).deleteCategory).toBeUndefined();
  });
});
