import { z } from "zod";
import { DISMISS_REASONS } from "@/modules/financial-consultant/domain/types/advisor-recommendation-state";

export const dismissReasonSchema = z.enum(DISMISS_REASONS);

export const dismissRecommendationBodySchema = z.object({
  dismissReason: dismissReasonSchema.optional(),
  actionType: z.string().optional(),
});

export const clickRecommendationBodySchema = z.object({
  actionType: z.string().min(1),
});

export type DismissRecommendationBody = z.infer<typeof dismissRecommendationBodySchema>;
export type ClickRecommendationBody = z.infer<typeof clickRecommendationBodySchema>;
