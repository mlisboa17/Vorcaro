export const ADVISOR_RECOMMENDATION_STATUSES = ["PENDING", "DISMISSED", "CLICKED"] as const;
export type AdvisorRecommendationStatus = (typeof ADVISOR_RECOMMENDATION_STATUSES)[number];

export const DISMISS_REASONS = [
  "NOT_RELEVANT",
  "ALREADY_HANDLED",
  "ACCEPTED_SPENDING",
  "REMIND_LATER",
] as const;
export type DismissReason = (typeof DISMISS_REASONS)[number];

export const DISMISS_TTL_DAYS = 30;

export const HASH_PATTERN = /^[a-f0-9]{64}$/i;
