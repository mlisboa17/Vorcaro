import type {
  StatementLayoutApprovalStatus,
  StatementLayoutRiskLevel,
} from "../types/statement-layout-model.types";

const PROMOTE_MIN_REAL_IMPORTS = 3;
const PROMOTE_MIN_ACCURACY = 95;

export function computeRiskLevel(input: {
  approvalStatus: StatementLayoutApprovalStatus;
  accuracyRate: number;
  similarityTier?: string | null;
  realImportCount: number;
}): StatementLayoutRiskLevel {
  if (input.approvalStatus === "REJECTED" || input.approvalStatus === "DISABLED") return "HIGH";
  if (input.approvalStatus === "TESTING") return "MEDIUM";
  if (input.accuracyRate >= PROMOTE_MIN_ACCURACY && input.realImportCount >= PROMOTE_MIN_REAL_IMPORTS) {
    return "LOW";
  }
  if (input.accuracyRate >= 85) return "MEDIUM";
  return "HIGH";
}

export function canPromoteToApproved(input: {
  approvalStatus: StatementLayoutApprovalStatus;
  accuracyRate: number;
  realImportCount: number;
  humanReviewConfirmed: boolean;
}): { ok: boolean; reason?: string } {
  if (input.approvalStatus === "APPROVED") {
    return { ok: false, reason: "Modelo já está aprovado" };
  }
  if (input.approvalStatus === "REJECTED") {
    return { ok: false, reason: "Modelo rejeitado não pode ser promovido" };
  }
  if (input.realImportCount < PROMOTE_MIN_REAL_IMPORTS) {
    return {
      ok: false,
      reason: `Requer pelo menos ${PROMOTE_MIN_REAL_IMPORTS} importações reais (atual: ${input.realImportCount})`,
    };
  }
  if (input.accuracyRate < PROMOTE_MIN_ACCURACY) {
    return {
      ok: false,
      reason: `accuracyRate mínimo ${PROMOTE_MIN_ACCURACY}% (atual: ${input.accuracyRate}%)`,
    };
  }
  if (!input.humanReviewConfirmed) {
    return { ok: false, reason: "Revisão humana não confirmada" };
  }
  return { ok: true };
}

export const LAYOUT_QUALITY_THRESHOLDS = {
  PROMOTE_MIN_REAL_IMPORTS,
  PROMOTE_MIN_ACCURACY,
  ACCURACY_DROP_SUSPICIOUS: 15,
} as const;
