import {
  RELATED_BANK_IDS,
  type StatementLayoutFingerprint,
  StatementLayoutMatchResult,
  StatementLayoutModelView,
  StatementLayoutSimilarityTier,
} from "../types/statement-layout-model.types";
import { SIMILARITY_TIER_THRESHOLDS } from "../types/statement-layout-model.types";
import {
  fingerprintFromJson,
  structureRulesFromJson,
} from "./statement-layout-fingerprint.service";

type ModelRecord = StatementLayoutModelView & {
  fingerprint: unknown;
  structureRules: unknown;
  approvalStatus?: import("../types/statement-layout-model.types").StatementLayoutApprovalStatus;
};

function overlapRatio(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b.map((v) => v.toLowerCase()));
  const matches = a.filter((v) => setB.has(v.toLowerCase())).length;
  return matches / Math.max(a.length, b.length);
}

function patternOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  let hits = 0;
  for (const left of a) {
    const leftNorm = left.toLowerCase().slice(0, 40);
    if (b.some((right) => right.toLowerCase().includes(leftNorm.slice(0, 20)) || leftNorm.includes(right.toLowerCase().slice(0, 20)))) {
      hits += 1;
    }
  }
  return hits / Math.max(a.length, b.length);
}

function tierFromScore(score: number): StatementLayoutSimilarityTier {
  if (score >= SIMILARITY_TIER_THRESHOLDS.HIGH) return "HIGH";
  if (score >= SIMILARITY_TIER_THRESHOLDS.MEDIUM) return "MEDIUM";
  return "LOW";
}

function bankScore(
  queryBankId: string | null,
  modelBankId: string,
  relatedBanks: Record<string, string[]>,
): number {
  if (!queryBankId) return 5;
  if (queryBankId === modelBankId) return 40;
  const related = relatedBanks[queryBankId] ?? [];
  if (related.includes(modelBankId)) return 22;
  return 0;
}

export function scoreLayoutSimilarity(
  query: StatementLayoutFingerprint,
  model: ModelRecord,
): number {
  const modelFingerprint = fingerprintFromJson(model.fingerprint);
  if (!modelFingerprint) return 0;

  let score = 0;

  score += bankScore(query.bankId, model.bankId, RELATED_BANK_IDS);

  if (query.fileFormat === model.fileFormat) score += 15;
  else if (query.fileFormat !== "UNKNOWN" && model.fileFormat !== "UNKNOWN") score += 5;

  if (query.profile === model.profile) score += 10;
  else if (query.profile !== "UNKNOWN" && model.profile !== "UNKNOWN") score += 4;

  score += overlapRatio(query.columnNames, modelFingerprint.columnNames) * 15;
  score += patternOverlap(query.headerPatterns, modelFingerprint.headerPatterns) * 8;
  score += patternOverlap(query.footerPatterns, modelFingerprint.footerPatterns) * 5;
  score += overlapRatio(query.keywords, modelFingerprint.keywords) * 12;
  score += patternOverlap(query.sampleLines, modelFingerprint.sampleLines) * 10;

  if (query.datePatterns.length && modelFingerprint.datePatterns.length) {
    score += overlapRatio(query.datePatterns, modelFingerprint.datePatterns) * 5;
  }

  const accuracyBoost = Math.min(model.accuracyRate, 100) * 0.05;
  score += accuracyBoost;

  return Math.min(100, Math.round(score * 10) / 10);
}

export function findBestLayoutMatch(
  query: StatementLayoutFingerprint,
  models: ModelRecord[],
): StatementLayoutMatchResult {
  const activeModels = models.filter((m) => m.status === "ACTIVE");

  if (activeModels.length === 0) {
    return {
      modelId: null,
      modelVersion: null,
      layoutLabel: null,
      bankId: query.bankId,
      bankName: query.bankName,
      profile: query.profile,
      fileFormat: query.fileFormat,
      similarityScore: 0,
      similarityTier: "LOW",
      isNewModel: true,
      matchedBankId: query.bankId,
      message: "Nenhum modelo treinado encontrado. Um novo modelo será criado após a revisão.",
    };
  }

  const ranked = activeModels
    .map((model) => ({
      model,
      score: scoreLayoutSimilarity(query, model),
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0]!;
  const tier = tierFromScore(best.score);

  let message = "";
  if (tier === "HIGH") {
    message = `Modelo "${best.model.layoutLabel}" (v${best.model.version}) aplicado automaticamente — alta similaridade (${best.score}%).`;
  } else if (tier === "MEDIUM") {
    message = `Modelo aproximado "${best.model.layoutLabel}" (v${best.model.version}) — similaridade média (${best.score}%). Revise os lançamentos destacados.`;
  } else {
    message = `Nenhum modelo confiável (${best.score}% com "${best.model.layoutLabel}"). Usando parser genérico e pedindo revisão.`;
  }

  return {
    modelId: tier === "LOW" ? null : best.model.id,
    modelVersion: tier === "LOW" ? null : best.model.version,
    layoutLabel: tier === "LOW" ? null : best.model.layoutLabel,
    bankId: tier === "LOW" ? query.bankId : best.model.bankId,
    bankName: tier === "LOW" ? query.bankName : best.model.bankName,
    profile: (tier === "LOW" ? query.profile : best.model.profile) as "PF" | "PJ" | "UNKNOWN",
    fileFormat: query.fileFormat,
    similarityScore: best.score,
    similarityTier: tier,
    isNewModel: false,
    matchedBankId: best.model.bankId,
    message,
  };
}

export function shouldForceReview(
  tier: StatementLayoutSimilarityTier,
  approvalStatus: import("../types/statement-layout-model.types").StatementLayoutApprovalStatus = "TESTING",
): boolean {
  if (approvalStatus === "TESTING") return true;
  if (approvalStatus === "APPROVED" && tier === "HIGH") return false;
  return tier !== "HIGH";
}

export { structureRulesFromJson };
