import { describe, expect, it } from "vitest";
import {
  mergeEligibleCandidateRules,
  upsertCandidateCorrection,
} from "../domain/services/statement-layout-candidate-rules.service";
import { buildDefaultStructureRules } from "../domain/services/statement-layout-fingerprint.service";
import {
  canPromoteToApproved,
  computeRiskLevel,
} from "../domain/services/statement-layout-quality.service";
import type { StatementLayoutStructureRules } from "../domain/types/statement-layout-model.types";

describe("statement layout quality", () => {
  it("modelo novo inicia elegível apenas como TESTING (promoção bloqueada)", () => {
    const check = canPromoteToApproved({
      approvalStatus: "TESTING",
      accuracyRate: 98,
      realImportCount: 1,
      humanReviewConfirmed: true,
    });
    expect(check.ok).toBe(false);
  });

  it("modelo ruim não é promovido", () => {
    const check = canPromoteToApproved({
      approvalStatus: "TESTING",
      accuracyRate: 70,
      realImportCount: 5,
      humanReviewConfirmed: true,
    });
    expect(check.ok).toBe(false);
    expect(check.reason).toContain("accuracyRate");
  });

  it("modelo elegível vira APPROVED após critérios mínimos", () => {
    const check = canPromoteToApproved({
      approvalStatus: "TESTING",
      accuracyRate: 96,
      realImportCount: 3,
      humanReviewConfirmed: true,
    });
    expect(check.ok).toBe(true);
  });

  it("computa risco baixo para APPROVED maduro", () => {
    expect(
      computeRiskLevel({
        approvalStatus: "APPROVED",
        accuracyRate: 98,
        realImportCount: 5,
      }),
    ).toBe("LOW");
  });
});

describe("candidate rules — anti-contaminação", () => {
  const baseRules: StatementLayoutStructureRules = {
    ...buildDefaultStructureRules({
      bankId: "test",
      bankName: "Test",
      profile: "PJ",
      fileFormat: "CSV",
      columnNames: ["Data"],
      headerPatterns: [],
      footerPatterns: [],
      balanceLinePatterns: [],
      continuationPatterns: [],
      datePatterns: [],
      amountPatterns: [],
      keywords: [],
      sampleLines: [],
      lineCount: 1,
    }),
    correctedExamples: [{ originalLine: "linha base", description: "ok" }],
  };

  it("correção isolada fica em candidateRules sem sobrescrever exemplos", () => {
    const withCandidate = upsertCandidateCorrection(baseRules, {
      originalLine: "05/06/2026;NOVA LINHA;;;",
      sourceFileName: "a.csv",
      correctedDescription: "AJUSTE",
    });
    expect(withCandidate.candidateRules?.length).toBe(1);
    expect(withCandidate.correctedExamples.length).toBe(1);
  });

  it("incorpora regra após repetição em múltiplos contextos", () => {
    let rules = upsertCandidateCorrection(baseRules, {
      originalLine: "05/06/2026;NOVA LINHA;;;",
      sourceFileName: "a.csv",
    });
    rules = upsertCandidateCorrection(rules, {
      originalLine: "05/06/2026;NOVA LINHA;;;",
      sourceFileName: "b.csv",
    });
    const merged = mergeEligibleCandidateRules(rules);
    expect(merged.correctedExamples.length).toBeGreaterThan(1);
  });
});
