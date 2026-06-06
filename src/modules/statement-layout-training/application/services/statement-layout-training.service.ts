import type { PrismaClient } from "@prisma/client";
import { ALL_BANK_PARSERS } from "@/lib/bank-parsers/bank-parsers.registry";
import {
  BankStatementParserResolver,
  resolveBankStatement,
} from "@/lib/bank-parsers/bank-statement-parser-resolver";
import type { ImportedFinancialLine } from "@/modules/financial-inbox/domain/types/imported-financial-line";
import type { ExtractedBankStatementTransaction } from "@/modules/financial-documents/domain/types/financial-document-import.types";
import {
  buildDefaultStructureRules,
  buildStatementLayoutFingerprint,
  structureRulesFromJson,
} from "../../domain/services/statement-layout-fingerprint.service";
import {
  mergeEligibleCandidateRules,
  markCandidateSuspicious,
  upsertCandidateCorrection,
} from "../../domain/services/statement-layout-candidate-rules.service";
import {
  findBestLayoutMatch,
  shouldForceReview,
} from "../../domain/services/statement-layout-matcher.service";
import {
  canPromoteToApproved,
  computeRiskLevel,
  LAYOUT_QUALITY_THRESHOLDS,
} from "../../domain/services/statement-layout-quality.service";
import { PrismaStatementLayoutRepository } from "../../infrastructure/repositories/prisma-statement-layout.repository";
import type {
  StatementLayoutFormat,
  StatementLayoutMatchResult,
  StatementLayoutStructureRules,
  StatementLayoutTrainingContext,
} from "../../domain/types/statement-layout-model.types";

const CORRECTIONS_BEFORE_MERGE = 3;
const LAYOUT_DIFFERENCE_THRESHOLD = 0.35;

function normalizeBankId(bankId: string | null | undefined, bankName: string | null | undefined): string {
  if (bankId?.trim()) return bankId.toLowerCase();
  if (bankName?.trim()) {
    return bankName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^ita_u$/, "itau");
  }
  return "desconhecido";
}

function layoutDifferenceScore(
  current: StatementLayoutStructureRules,
  incoming: StatementLayoutStructureRules,
): number {
  const colOverlap =
    current.expectedColumns.length === 0
      ? 0
      : incoming.expectedColumns.filter((c) => current.expectedColumns.includes(c)).length /
        Math.max(current.expectedColumns.length, incoming.expectedColumns.length);

  const headerOverlap =
    current.headerPatterns.length === 0
      ? 0
      : incoming.headerPatterns.filter((h) =>
          current.headerPatterns.some((c) => c.slice(0, 20) === h.slice(0, 20)),
        ).length / Math.max(current.headerPatterns.length, 1);

  return 1 - (colOverlap * 0.6 + headerOverlap * 0.4);
}

export class StatementLayoutTrainingService {
  private readonly repo: PrismaStatementLayoutRepository;

  constructor(private readonly db: PrismaClient) {
    this.repo = new PrismaStatementLayoutRepository(db);
  }

  async listModels(userId: string) {
    return this.repo.listAllByUser(userId);
  }

  async matchForImport(input: {
    userId: string;
    content: string;
    fileName?: string;
    fileFormat: StatementLayoutFormat;
  }): Promise<StatementLayoutTrainingContext> {
    const fingerprint = buildStatementLayoutFingerprint({
      content: input.content,
      fileName: input.fileName,
      fileFormat: input.fileFormat,
    });

    const models = await this.repo.listForMatchingViews(input.userId);
    const match = findBestLayoutMatch(
      fingerprint,
      models.map((m) => ({
        ...m,
        fileFormat: m.fileFormat as StatementLayoutFormat,
        accuracyRate: m.accuracyRate,
        lastSimilarityScore: m.lastSimilarityScore,
        lastUsedAt: m.lastUsedAt,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        status: m.status as "ACTIVE" | "INACTIVE",
        approvalStatus: m.approvalStatus,
        isBuiltIn: m.isBuiltIn,
      })),
    );

    const matchedModel = match.modelId ? models.find((m) => m.id === match.modelId) : null;
    const forceReview =
      shouldForceReview(match.similarityTier, matchedModel?.approvalStatus ?? "TESTING") ||
      matchedModel?.approvalStatus === "TESTING";

    if (match.modelId) {
      await this.repo.recordUsage(match.modelId, match.similarityScore);
    }

    return {
      match,
      forceReview,
    };
  }

  async ensureModelAfterFirstImport(input: {
    userId: string;
    content: string;
    fileName?: string;
    fileFormat: StatementLayoutFormat;
    match: StatementLayoutMatchResult;
  }) {
    if (input.match.modelId) return input.match;

    const fingerprint = buildStatementLayoutFingerprint({
      content: input.content,
      fileName: input.fileName,
      fileFormat: input.fileFormat,
    });

    const bankId = normalizeBankId(fingerprint.bankId, fingerprint.bankName);
    const bankName = fingerprint.bankName ?? bankId;
    const structureRules = buildDefaultStructureRules(fingerprint);

    const created = await this.repo.createModel({
      userId: input.userId,
      bankId,
      bankName,
      profile: fingerprint.profile,
      fileFormat: input.fileFormat,
      layoutLabel: `${bankName} · ${input.fileFormat} · v1`,
      accountType: fingerprint.profile !== "UNKNOWN" ? fingerprint.profile : null,
      fingerprint,
      structureRules,
    });

    return {
      ...input.match,
      modelId: created.id,
      modelVersion: created.version,
      layoutLabel: created.layoutLabel,
      isNewModel: true,
      message: `Primeiro extrato deste layout — modelo "${created.layoutLabel}" criado.`,
    } satisfies StatementLayoutMatchResult;
  }

  applyTrainingToInboxLines(
    lines: ImportedFinancialLine[],
    context: StatementLayoutTrainingContext,
  ): ImportedFinancialLine[] {
    if (!context.forceReview) return lines;

    return lines.map((line) => {
      if (line.parseStatus === "IGNORED") return line;
      if (line.parseStatus === "NEEDS_REVIEW" || line.parseStatus === "ERROR") return line;
      if (context.match.similarityTier === "MEDIUM") {
        return {
          ...line,
          parseStatus: "NEEDS_REVIEW" as const,
          reviewMessage:
            line.reviewMessage ??
            "Modelo aproximado aplicado — confira data, descrição e valor antes de importar.",
        };
      }
      return line;
    });
  }

  applyTrainingToDocumentLines(
    lines: ExtractedBankStatementTransaction[],
    context: StatementLayoutTrainingContext,
  ): ExtractedBankStatementTransaction[] {
    if (!context.forceReview) return lines;

    return lines.map((line) => {
      if (line.parseStatus === "IGNORED") return line;
      if (line.parseStatus === "NEEDS_REVIEW" || line.parseStatus === "ERROR") return line;
      if (context.match.similarityTier === "MEDIUM") {
        return {
          ...line,
          parseStatus: "NEEDS_REVIEW",
          reviewMessage:
            line.reviewMessage ??
            "Modelo aproximado aplicado — confira este lançamento antes de confirmar.",
          selected: false,
        };
      }
      return line;
    });
  }

  async learnFromCorrections(input: {
    userId: string;
    layoutModelId: string;
    corrections: Array<{
      originalLine: string;
      correctedDate?: string;
      correctedDescription?: string;
      correctedAmount?: number;
      sourceDocumentId?: string;
      sourceFileName?: string;
    }>;
    contentFingerprint?: ReturnType<typeof buildStatementLayoutFingerprint>;
  }) {
    if (input.corrections.length === 0) return;

    await this.repo.saveCorrections({
      userId: input.userId,
      layoutModelId: input.layoutModelId,
      corrections: input.corrections,
    });

    const model = await this.db.bankStatementLayoutModel.findFirst({
      where: { id: input.layoutModelId, userId: input.userId },
    });
    if (!model) return;

    const currentRules = structureRulesFromJson(model.structureRules);
    if (!currentRules) return;

    const accuracyBefore = model.accuracyRate;

    let rulesWithCandidates = currentRules;
    for (const correction of input.corrections) {
      rulesWithCandidates = upsertCandidateCorrection(rulesWithCandidates, {
        originalLine: correction.originalLine,
        sourceFileName: correction.sourceFileName,
        correctedDescription: correction.correctedDescription,
        correctedAmount: correction.correctedAmount,
      });
    }

    rulesWithCandidates = mergeEligibleCandidateRules(rulesWithCandidates);

    const examples = [
      ...rulesWithCandidates.correctedExamples,
      ...input.corrections.map((c) => ({
        originalLine: c.originalLine,
        date: c.correctedDate,
        description: c.correctedDescription,
        amount: c.correctedAmount,
      })),
    ].slice(-50);

    const mergedRules: StatementLayoutStructureRules = {
      ...rulesWithCandidates,
      correctedExamples: examples,
    };

    const incomingFingerprint = input.contentFingerprint;

    const layoutDiff =
      incomingFingerprint && currentRules
        ? layoutDifferenceScore(currentRules, buildDefaultStructureRules(incomingFingerprint))
        : 0;

    const shouldForkVersion =
      layoutDiff >= LAYOUT_DIFFERENCE_THRESHOLD &&
      model.correctionCount + input.corrections.length >= CORRECTIONS_BEFORE_MERGE;

    if (shouldForkVersion && incomingFingerprint) {
      await this.repo.createVersionFromModel({
        userId: input.userId,
        parentModelId: model.id,
        layoutLabel: `${model.bankName} · ${model.fileFormat} · v${model.version + 1}`,
        fingerprint: incomingFingerprint,
        structureRules: mergedRules,
      });
      return;
    }

    await this.repo.updateModel(input.userId, model.id, {
      structureRules: mergedRules,
      ...(incomingFingerprint ? { fingerprint: incomingFingerprint } : {}),
    });

    await this.repo.recordSuccess(model.id);

    const after = await this.db.bankStatementLayoutModel.findFirst({ where: { id: model.id } });
    if (
      after &&
      accuracyBefore - after.accuracyRate >= LAYOUT_QUALITY_THRESHOLDS.ACCURACY_DROP_SUSPICIOUS
    ) {
      const suspiciousRules = markCandidateSuspicious(mergedRules, "queda brusca de accuracy");
      await this.repo.updateModel(input.userId, model.id, { structureRules: suspiciousRules });
      if (incomingFingerprint) {
        await this.repo.createVersionFromModel({
          userId: input.userId,
          parentModelId: model.id,
          layoutLabel: `${model.bankName} · ${model.fileFormat} · v${model.version + 1} (suspeita)`,
          fingerprint: incomingFingerprint,
          structureRules: suspiciousRules,
        });
      }
    }

    if (after) {
      const riskLevel = computeRiskLevel({
        approvalStatus: after.approvalStatus as "TESTING" | "APPROVED" | "DISABLED" | "REJECTED",
        accuracyRate: after.accuracyRate,
        realImportCount: after.realImportCount,
      });
      await this.repo.updateApprovalStatus(input.userId, model.id, after.approvalStatus as "TESTING" | "APPROVED" | "DISABLED" | "REJECTED", {
        riskLevel,
      });
    }
  }

  async markRealImport(userId: string, modelId: string) {
    const model = await this.db.bankStatementLayoutModel.findFirst({ where: { id: modelId, userId } });
    if (!model) return;
    await this.repo.incrementRealImportCount(modelId);
    const updated = await this.db.bankStatementLayoutModel.findFirst({ where: { id: modelId } });
    if (!updated) return;
    const riskLevel = computeRiskLevel({
      approvalStatus: updated.approvalStatus as "TESTING" | "APPROVED" | "DISABLED" | "REJECTED",
      accuracyRate: updated.accuracyRate,
      realImportCount: updated.realImportCount,
    });
    await this.repo.updateApprovalStatus(userId, modelId, updated.approvalStatus as "TESTING" | "APPROVED" | "DISABLED" | "REJECTED", {
      riskLevel,
    });
  }

  async promoteToApproved(userId: string, modelId: string, humanReviewConfirmed = true) {
    const model = await this.db.bankStatementLayoutModel.findFirst({ where: { id: modelId, userId } });
    if (!model) return { ok: false as const, reason: "Modelo não encontrado" };

    const check = canPromoteToApproved({
      approvalStatus: model.approvalStatus as "TESTING" | "APPROVED" | "DISABLED" | "REJECTED",
      accuracyRate: model.accuracyRate,
      realImportCount: model.realImportCount,
      humanReviewConfirmed,
    });
    if (!check.ok) return { ok: false as const, reason: check.reason ?? "Não elegível" };

    await this.repo.updateApprovalStatus(userId, modelId, "APPROVED", {
      humanReviewConfirmedAt: new Date(),
      riskLevel: "LOW",
    });
    return { ok: true as const };
  }

  async rejectModel(userId: string, modelId: string) {
    return this.repo.updateApprovalStatus(userId, modelId, "REJECTED", { riskLevel: "HIGH" });
  }

  async rollbackModelVersion(userId: string, modelId: string) {
    const model = await this.db.bankStatementLayoutModel.findFirst({ where: { id: modelId, userId } });
    if (!model?.parentModelId) return { ok: false as const, reason: "Sem versão anterior" };

    const parent = await this.db.bankStatementLayoutModel.findFirst({
      where: { id: model.parentModelId, userId },
    });
    if (!parent) return { ok: false as const, reason: "Versão anterior não encontrada" };

    await this.repo.updateStatus(userId, modelId, "INACTIVE");
    await this.repo.updateApprovalStatus(userId, modelId, "DISABLED", { riskLevel: "HIGH" });
    await this.repo.updateStatus(userId, parent.id, "ACTIVE");
    await this.repo.updateApprovalStatus(userId, parent.id, "TESTING", { riskLevel: "MEDIUM" });

    return { ok: true as const, restoredModelId: parent.id };
  }

  async recordImportSuccess(modelId: string) {
    await this.repo.recordSuccess(modelId);
  }

  async setStatus(userId: string, id: string, status: "ACTIVE" | "INACTIVE") {
    return this.repo.updateStatus(userId, id, status);
  }

  async deleteModel(userId: string, id: string) {
    return this.repo.deleteModel(userId, id);
  }

  async updateModel(
    userId: string,
    id: string,
    data: { layoutLabel?: string; accountType?: string | null; status?: "ACTIVE" | "INACTIVE" },
  ) {
    return this.repo.updateModel(userId, id, data);
  }
}

export function resolveBankStatementWithLayoutHint(
  text: string,
  match: StatementLayoutMatchResult,
) {
  if (!match.bankId || match.similarityTier === "LOW") {
    return resolveBankStatement(text);
  }

  const prioritized = [...ALL_BANK_PARSERS].sort((a, b) => {
    if (a.bankId === match.bankId) return -1;
    if (b.bankId === match.bankId) return 1;
    return 0;
  });

  return new BankStatementParserResolver(prioritized).resolve(text);
}
