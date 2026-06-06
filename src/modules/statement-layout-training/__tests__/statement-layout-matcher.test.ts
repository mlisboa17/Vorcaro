import { describe, expect, it } from "vitest";
import { buildStatementLayoutFingerprint } from "@/modules/statement-layout-training/domain/services/statement-layout-fingerprint.service";
import {
  findBestLayoutMatch,
  scoreLayoutSimilarity,
} from "@/modules/statement-layout-training/domain/services/statement-layout-matcher.service";
import type { StatementLayoutModelView } from "@/modules/statement-layout-training/domain/types/statement-layout-model.types";

const bradescoFingerprint = buildStatementLayoutFingerprint({
  content: [
    "BRADESCO EXTRATO CONTA CORRENTE",
    "Agência 1234 Conta 56789-0",
    "Data Histórico Valor",
    "01/06/2026 PIX ENVIADO -100,00",
    "02/06/2026 TED RECEBIDA 500,00",
    "Saldo final 1.234,56",
  ].join("\n"),
  fileFormat: "PDF",
});

function model(partial: Partial<StatementLayoutModelView> & { fingerprint: unknown }): StatementLayoutModelView & { fingerprint: unknown; structureRules: unknown } {
  return {
    id: partial.id ?? "m1",
    bankId: partial.bankId ?? "bradesco",
    bankName: partial.bankName ?? "Bradesco",
    profile: partial.profile ?? "PF",
    fileFormat: partial.fileFormat ?? "PDF",
    layoutLabel: partial.layoutLabel ?? "Bradesco · PDF · v1",
    accountType: partial.accountType ?? "PF",
    version: partial.version ?? 1,
    accuracyRate: partial.accuracyRate ?? 80,
    usageCount: partial.usageCount ?? 5,
    successCount: partial.successCount ?? 4,
    correctionCount: partial.correctionCount ?? 1,
    lastUsedAt: partial.lastUsedAt ?? null,
    lastSimilarityScore: partial.lastSimilarityScore ?? null,
    status: partial.status ?? "ACTIVE",
    approvalStatus: partial.approvalStatus ?? "TESTING",
    riskLevel: partial.riskLevel ?? "MEDIUM",
    realImportCount: partial.realImportCount ?? 0,
    humanReviewConfirmedAt: partial.humanReviewConfirmedAt ?? null,
    isBuiltIn: partial.isBuiltIn ?? false,
    parentModelId: partial.parentModelId ?? null,
    createdAt: partial.createdAt ?? new Date().toISOString(),
    updatedAt: partial.updatedAt ?? new Date().toISOString(),
    fingerprint: partial.fingerprint,
    structureRules: {},
  };
}

describe("statement layout matcher", () => {
  it("cria intenção de novo modelo quando não há modelos treinados", () => {
    const match = findBestLayoutMatch(bradescoFingerprint, []);
    expect(match.isNewModel).toBe(true);
    expect(match.similarityTier).toBe("LOW");
    expect(match.modelId).toBeNull();
  });

  it("reutiliza modelo parecido do mesmo banco com alta similaridade", () => {
    const stored = model({ fingerprint: bradescoFingerprint });
    const match = findBestLayoutMatch(bradescoFingerprint, [stored]);
    expect(match.modelId).toBe("m1");
    expect(match.similarityTier).toBe("HIGH");
    expect(match.similarityScore).toBeGreaterThanOrEqual(75);
  });

  it("prefere banco relacionado quando não há modelo exato", () => {
    const santander = model({
      id: "s1",
      bankId: "santander",
      bankName: "Santander",
      fingerprint: {
        ...bradescoFingerprint,
        bankId: "santander",
        bankName: "Santander",
      },
    });

    const score = scoreLayoutSimilarity(bradescoFingerprint, santander);
    expect(score).toBeGreaterThan(30);

    const match = findBestLayoutMatch(bradescoFingerprint, [santander]);
    expect(match.similarityTier).not.toBe("LOW");
  });
});
