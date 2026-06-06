import type { PrismaClient, BankStatementLayoutModel, Prisma } from "@prisma/client";
import type {
  StatementLayoutFingerprint,
  StatementLayoutFormat,
  StatementLayoutModelView,
  StatementLayoutStatus,
  StatementLayoutApprovalStatus,
  StatementLayoutRiskLevel,
  StatementLayoutStructureRules,
} from "../../domain/types/statement-layout-model.types";

function rulesToJson(rules: StatementLayoutStructureRules): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(rules)) as Prisma.InputJsonValue;
}

function fingerprintToJson(fp: StatementLayoutFingerprint): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(fp)) as Prisma.InputJsonValue;
}

function toView(model: BankStatementLayoutModel): StatementLayoutModelView {
  return {
    id: model.id,
    bankId: model.bankId,
    bankName: model.bankName,
    profile: model.profile,
    fileFormat: model.fileFormat as StatementLayoutFormat,
    layoutLabel: model.layoutLabel,
    accountType: model.accountType,
    version: model.version,
    accuracyRate: model.accuracyRate,
    usageCount: model.usageCount,
    successCount: model.successCount,
    correctionCount: model.correctionCount,
    lastUsedAt: model.lastUsedAt?.toISOString() ?? null,
    lastSimilarityScore: model.lastSimilarityScore,
    status: model.status as StatementLayoutStatus,
    approvalStatus: model.approvalStatus as StatementLayoutApprovalStatus,
    riskLevel: model.riskLevel as StatementLayoutRiskLevel,
    realImportCount: model.realImportCount,
    humanReviewConfirmedAt: model.humanReviewConfirmedAt?.toISOString() ?? null,
    isBuiltIn: model.isBuiltIn,
    parentModelId: model.parentModelId,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}

export class PrismaStatementLayoutRepository {
  constructor(private readonly db: PrismaClient) {}

  async listActiveByUser(userId: string) {
    const models = await this.db.bankStatementLayoutModel.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: [{ lastUsedAt: "desc" }, { updatedAt: "desc" }],
    });
    return models.map(toView);
  }

  async listAllByUser(userId: string) {
    const models = await this.db.bankStatementLayoutModel.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });
    return models.map(toView);
  }

  async listForMatching(userId: string) {
    return this.db.bankStatementLayoutModel.findMany({
      where: {
        userId,
        status: "ACTIVE",
        approvalStatus: { notIn: ["REJECTED", "DISABLED"] },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async listForMatchingViews(userId: string) {
    const models = await this.listForMatching(userId);
    return models.map((m) => ({
      ...toView(m),
      fingerprint: m.fingerprint,
      structureRules: m.structureRules,
    }));
  }

  async findById(userId: string, id: string) {
    const model = await this.db.bankStatementLayoutModel.findFirst({
      where: { id, userId },
    });
    return model ? toView(model) : null;
  }

  async createModel(input: {
    userId: string;
    bankId: string;
    bankName: string;
    profile: string;
    fileFormat: StatementLayoutFormat;
    layoutLabel: string;
    accountType?: string | null;
    fingerprint: StatementLayoutFingerprint;
    structureRules: StatementLayoutStructureRules;
    parentModelId?: string | null;
  }) {
    const model = await this.db.bankStatementLayoutModel.create({
      data: {
        userId: input.userId,
        bankId: input.bankId,
        bankName: input.bankName,
        profile: input.profile,
        fileFormat: input.fileFormat,
        layoutLabel: input.layoutLabel,
        accountType: input.accountType ?? null,
        fingerprint: fingerprintToJson(input.fingerprint),
        structureRules: rulesToJson(input.structureRules),
        parentModelId: input.parentModelId ?? null,
      },
    });
    return toView(model);
  }

  async recordUsage(modelId: string, similarityScore: number) {
    await this.db.bankStatementLayoutModel.update({
      where: { id: modelId },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
        lastSimilarityScore: similarityScore,
      },
    });
  }

  async recordSuccess(modelId: string) {
    const model = await this.db.bankStatementLayoutModel.update({
      where: { id: modelId },
      data: {
        successCount: { increment: 1 },
      },
    });
    const accuracyRate =
      model.usageCount > 0 ? Math.round((model.successCount / model.usageCount) * 1000) / 10 : 0;
    await this.db.bankStatementLayoutModel.update({
      where: { id: modelId },
      data: { accuracyRate },
    });
  }

  async updateStatus(userId: string, id: string, status: StatementLayoutStatus) {
    const result = await this.db.bankStatementLayoutModel.updateMany({
      where: { id, userId },
      data: { status },
    });
    return result.count > 0;
  }

  async updateApprovalStatus(
    userId: string,
    id: string,
    approvalStatus: StatementLayoutApprovalStatus,
    extra?: { humanReviewConfirmedAt?: Date | null; riskLevel?: StatementLayoutRiskLevel },
  ) {
    const result = await this.db.bankStatementLayoutModel.updateMany({
      where: { id, userId },
      data: {
        approvalStatus,
        ...(extra?.humanReviewConfirmedAt !== undefined
          ? { humanReviewConfirmedAt: extra.humanReviewConfirmedAt }
          : {}),
        ...(extra?.riskLevel ? { riskLevel: extra.riskLevel } : {}),
      },
    });
    return result.count > 0;
  }

  async incrementRealImportCount(modelId: string) {
    await this.db.bankStatementLayoutModel.update({
      where: { id: modelId },
      data: { realImportCount: { increment: 1 } },
    });
  }

  async deactivateSiblingVersions(userId: string, parentModelId: string, keepId: string) {
    await this.db.bankStatementLayoutModel.updateMany({
      where: {
        userId,
        OR: [{ id: parentModelId }, { parentModelId }],
        NOT: { id: keepId },
      },
      data: { status: "INACTIVE" },
    });
  }

  async updateModel(
    userId: string,
    id: string,
    data: {
      layoutLabel?: string;
      accountType?: string | null;
      status?: StatementLayoutStatus;
      structureRules?: StatementLayoutStructureRules;
      fingerprint?: StatementLayoutFingerprint;
    },
  ) {
    const result = await this.db.bankStatementLayoutModel.updateMany({
      where: { id, userId },
      data: {
        ...(data.layoutLabel ? { layoutLabel: data.layoutLabel } : {}),
        ...(data.accountType !== undefined ? { accountType: data.accountType } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.structureRules ? { structureRules: rulesToJson(data.structureRules) } : {}),
        ...(data.fingerprint ? { fingerprint: fingerprintToJson(data.fingerprint) } : {}),
      },
    });
    return result.count > 0;
  }

  async deleteModel(userId: string, id: string) {
    const result = await this.db.bankStatementLayoutModel.deleteMany({
      where: { id, userId },
    });
    return result.count > 0;
  }

  async saveCorrections(input: {
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
  }) {
    if (input.corrections.length === 0) return;

    await this.db.bankStatementLayoutCorrection.createMany({
      data: input.corrections.map((c) => ({
        userId: input.userId,
        layoutModelId: input.layoutModelId,
        originalLine: c.originalLine,
        correctedDate: c.correctedDate ?? null,
        correctedDescription: c.correctedDescription ?? null,
        correctedAmount: c.correctedAmount ?? null,
        sourceDocumentId: c.sourceDocumentId ?? null,
        sourceFileName: c.sourceFileName ?? null,
        appliedToModel: true,
      })),
    });

    await this.db.bankStatementLayoutModel.update({
      where: { id: input.layoutModelId },
      data: { correctionCount: { increment: input.corrections.length } },
    });
  }

  async createVersionFromModel(input: {
    userId: string;
    parentModelId: string;
    layoutLabel: string;
    fingerprint: StatementLayoutFingerprint;
    structureRules: StatementLayoutStructureRules;
  }) {
    const parent = await this.db.bankStatementLayoutModel.findFirst({
      where: { id: input.parentModelId, userId: input.userId },
    });
    if (!parent) return null;

    const model = await this.db.bankStatementLayoutModel.create({
      data: {
        userId: input.userId,
        bankId: parent.bankId,
        bankName: parent.bankName,
        profile: parent.profile,
        fileFormat: parent.fileFormat,
        layoutLabel: input.layoutLabel,
        accountType: parent.accountType,
        fingerprint: fingerprintToJson(input.fingerprint),
        structureRules: rulesToJson(input.structureRules),
        version: parent.version + 1,
        parentModelId: parent.id,
      },
    });

    return toView(model);
  }
}
