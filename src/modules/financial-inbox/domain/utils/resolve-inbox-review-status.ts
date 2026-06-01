import type { FinancialExtraction } from "../../domain/ports/ai-service.port";
import type { InboxStatus } from "@prisma/client";

const CONFIDENCE_THRESHOLD = 0.75;
const CRITICAL_FIELDS = ["amount", "type"] as const;

export function resolveInboxReviewStatus(extraction: FinancialExtraction): InboxStatus {
  if (needsConfirmation(extraction)) {
    return "NEEDS_CONFIRMATION";
  }

  return "READY";
}

function needsConfirmation(extraction: FinancialExtraction): boolean {
  if (extraction.amount === null) {
    return true;
  }

  if (extraction.type === "UNKNOWN") {
    return true;
  }

  for (const field of CRITICAL_FIELDS) {
    const score = extraction.confidence[field] ?? 0;
    if (score < CONFIDENCE_THRESHOLD) {
      return true;
    }
  }

  if (
    extraction.missingFields.some((field) =>
      CRITICAL_FIELDS.includes(field as (typeof CRITICAL_FIELDS)[number]),
    )
  ) {
    return true;
  }

  return false;
}
