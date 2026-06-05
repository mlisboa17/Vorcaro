import { describe, expect, it } from "vitest";
import { VorcaroCategoryAuditFormatter } from "../application/formatters/vorcaro-category-audit-formatter";
import type { CategoryAuditReport } from "@/modules/categories/domain/types/category-audit";
import { enrichAuditReport } from "@/modules/categories/domain/services/category-audit-health";
import { VorcaroIntentResponseFormatter } from "../application/services/vorcaro-intent-response-formatter.service";
import type { VorcaroToolResult } from "../domain/types/vorcaro-intent";

const TECHNICAL_ENUM_PATTERN =
  /DUPLICATE_CATEGORY|DUPLICATE_SUBCATEGORY|SUPPLIER_AS_CATEGORY|OVERLAPPING_CATEGORY|INCONSISTENT_NAMING|LOW_USAGE_CATEGORY|MERGE_SUGGESTION/i;
const CONFIDENCE_PATTERN = /confian[cç]a\s*\d+%/i;
const FIA_PATTERN = /\*\*FATO\*\*|\*\*IMPACTO\*\*|\*\*AÇÃO\*\*/;

function supplierReport(): CategoryAuditReport {
  return enrichAuditReport({
    findings: [
      {
        type: "SUPPLIER_AS_CATEGORY",
        severity: "HIGH",
        title: "Fornecedor",
        description: "iFood",
        currentItems: ["iFood"],
        suggestedAction: "Sugestão: mover para Delivery.",
        confidence: 0.94,
      },
      {
        type: "SUPPLIER_AS_CATEGORY",
        severity: "HIGH",
        title: "Fornecedor",
        description: "Uber",
        currentItems: ["Uber"],
        suggestedAction: "Sugestão: mover para Transporte.",
        confidence: 0.93,
      },
      {
        type: "SUPPLIER_AS_CATEGORY",
        severity: "HIGH",
        title: "Fornecedor",
        description: "Zé Delivery",
        currentItems: ["Zé Delivery"],
        suggestedAction: "Sugestão: mover para Delivery.",
        confidence: 0.91,
      },
    ],
    summary: { totalFindings: 3, high: 3, medium: 0, low: 0 },
    suggestedMerges: [],
    supplierLikeCategories: ["iFood", "Uber", "Zé Delivery"],
    lowUsageCategories: [],
  });
}

function mixedReport(): CategoryAuditReport {
  return enrichAuditReport({
    findings: [
      {
        type: "DUPLICATE_SUBCATEGORY",
        severity: "MEDIUM",
        title: "Duplicata",
        description: "Restaurante",
        currentItems: ["Alimentação → Restaurante", "Alimentação → Restaurantes"],
        suggestedAction: "Fundir",
        confidence: 0.93,
      },
      {
        type: "OVERLAPPING_CATEGORY",
        severity: "MEDIUM",
        title: "IOF",
        description: "IOF",
        currentItems: ["Financeiro → IOF", "Encargos → IOF"],
        suggestedAction: "Centralizar",
        confidence: 0.91,
      },
      {
        type: "OVERLAPPING_CATEGORY",
        severity: "MEDIUM",
        title: "Juros",
        description: "Juros",
        currentItems: ["Financeiro → Juros", "Encargos → Juros"],
        suggestedAction: "Centralizar",
        confidence: 0.9,
      },
      ...supplierReport().findings,
    ],
    summary: { totalFindings: 6, high: 3, medium: 3, low: 0 },
    suggestedMerges: [],
    supplierLikeCategories: ["iFood", "Uber", "Zé Delivery"],
    lowUsageCategories: ["Categoria Órfã"],
  });
}

describe("VorcaroCategoryAuditFormatter", () => {
  const formatter = new VorcaroCategoryAuditFormatter();

  it("não exibe enums técnicos nem confiança na resposta conversacional", () => {
    const message = formatter.formatChatMessage(mixedReport(), "Minhas categorias estão boas?");
    expect(message).not.toMatch(TECHNICAL_ENUM_PATTERN);
    expect(message).not.toMatch(CONFIDENCE_PATTERN);
    expect(message).not.toMatch(/\b116\b|\b93\b itens|\bpontos encontrados/i);
  });

  it("agrupa fornecedores em um único tópico com exemplos", () => {
    const formatted = formatter.format(supplierReport());
    expect(formatted.priorities.length).toBeLessThanOrEqual(5);
    const supplierTopic = formatted.priorities.find((t) => /empresas|canais de compra/i.test(t.message));
    expect(supplierTopic).toBeDefined();
    expect(supplierTopic?.examples).toEqual(expect.arrayContaining(["iFood", "Uber", "Zé Delivery"]));
    expect(formatted.priorities.filter((t) => /ifood/i.test(t.message)).length).toBeLessThanOrEqual(1);
  });

  it("exibe no máximo 5 tópicos prioritários", () => {
    const formatted = formatter.format(mixedReport());
    expect(formatted.priorities.length).toBeLessThanOrEqual(5);
  });

  it("usa CTA humanizado", () => {
    const formatted = formatter.format(mixedReport());
    expect(formatted.ctaDescription).toMatch(/proposta de reorganização|antes de qualquer alteração/i);
    expect(formatted.ctaDescription).not.toMatch(/relatório completo/i);
  });

  it("assume postura consultiva para perguntas de melhoria", () => {
    const message = formatter.formatChatMessage(
      enrichAuditReport({
        findings: [],
        summary: { totalFindings: 0, high: 0, medium: 0, low: 0 },
        suggestedMerges: [],
        supplierLikeCategories: [],
        lowUsageCategories: [],
      }),
      "O que você melhoraria nas categorias?",
    );
    expect(message).toMatch(/começaria|três frentes|duplicadas|empresas/i);
    expect(message).not.toMatch(FIA_PATTERN);
  });

  it("gera resumo executivo para o dashboard", () => {
    const summary = formatter.formatExecutiveSummary(mixedReport());
    expect(summary).toMatch(/taxonomia|oportunidades|duplicadas|empresas/i);
    expect(summary).not.toMatch(TECHNICAL_ENUM_PATTERN);
    expect(summary).not.toMatch(CONFIDENCE_PATTERN);
  });
});

describe("VorcaroIntentResponseFormatter — CATEGORY_AUDIT", () => {
  const responseFormatter = new VorcaroIntentResponseFormatter();
  const auditFormatter = new VorcaroCategoryAuditFormatter();

  it("não usa estrutura FATO/IMPACTO/AÇÃO para auditoria de categorias", () => {
    const report = mixedReport();
    const result: VorcaroToolResult = {
      intent: "CATEGORY_AUDIT",
      title: "Organização das categorias",
      summary: auditFormatter.formatChatMessage(report, "Minhas categorias estão boas?"),
      facts: [],
      metrics: {},
      recommendations: [],
    };

    const text = responseFormatter.format([result]);
    expect(text).not.toMatch(FIA_PATTERN);
    expect(text).toMatch(/Analisei suas categorias|estrutura geral está boa/i);
  });
});
