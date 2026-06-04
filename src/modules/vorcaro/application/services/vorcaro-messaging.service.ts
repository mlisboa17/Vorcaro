import type { PrismaClient } from "@prisma/client";
import type { NotificationType } from "@/modules/notifications/domain/types/notification";
import type {
  VorcaroCriticalInput,
  VorcaroMessageInput,
  VorcaroStructuredMessage,
  VorcaroTemplateCategory,
  VorcaroTone,
} from "../../domain/types/vorcaro-personality";
import { VORCARO_TONE_LABELS } from "../../domain/types/vorcaro-personality";
import { getToneIntensity } from "../../domain/vorcaro-tone-intensity";
import { getVorcaroDisplayName, getVorcaroTagline } from "../../domain/vorcaro-profile";
import { VorcaroResponseFormatter } from "./vorcaro-response-formatter.service";
import {
  VORCARO_RECENT_TEMPLATE_LIMIT,
  VORCARO_TEMPLATE_COOLDOWN_DAYS,
  VorcaroTemplateSelectorService,
} from "./vorcaro-template-selector.service";
import { VorcaroSystemPromptService } from "./vorcaro-system-prompt.service";
import type { VorcaroSystemPromptOptions } from "./vorcaro-system-prompt.service";
import { VorcaroToneGuardrailService } from "./vorcaro-tone-guardrail.service";
import { VorcaroMoodResolverService } from "./vorcaro-mood-resolver.service";
import { PrismaVorcaroMessageHistoryRepository } from "../../infrastructure/repositories/prisma-vorcaro-message-history.repository";
import { PrismaVorcaroPreferenceRepository } from "../../infrastructure/repositories/prisma-vorcaro-preference.repository";

const NOTIFICATION_TYPE_TO_CATEGORY: Partial<Record<NotificationType, VorcaroTemplateCategory>> = {
  RECEIVABLE_OVERDUE: "OVERDUE_RECEIVABLE",
  GOAL_AT_RISK: "GOAL_AT_RISK",
  CASHFLOW_WARNING: "NEGATIVE_CASHFLOW",
  MONEY_LEAK: "MONEY_LEAK",
  DUPLICATE_SUBSCRIPTION: "DUPLICATE_STREAMING",
  HIGH_COMMITMENT_MONTH: "HIGH_COMMITMENT",
  RECOMMENDATION_CREATED: "GENERAL",
  ALERT_CREATED: "GENERAL",
  DAILY_DIGEST: "GENERAL",
  WEEKLY_DIGEST: "PATRIMONY",
};

export type VorcaroLlmPromptContext = {
  preferredTone: VorcaroTone;
  effectiveTone: VorcaroTone;
  system: string;
  category: VorcaroTemplateCategory;
};

export class VorcaroMessagingService {
  private readonly history: PrismaVorcaroMessageHistoryRepository;
  private readonly preferences: PrismaVorcaroPreferenceRepository;
  private readonly selector = new VorcaroTemplateSelectorService();
  private readonly formatter = new VorcaroResponseFormatter();
  private readonly systemPrompt = new VorcaroSystemPromptService();
  private readonly guardrail = new VorcaroToneGuardrailService();
  private readonly moodResolver = new VorcaroMoodResolverService();

  constructor(private readonly db: PrismaClient) {
    this.history = new PrismaVorcaroMessageHistoryRepository(db);
    this.preferences = new PrismaVorcaroPreferenceRepository(db);
  }

  getDisplayName(): string {
    return getVorcaroDisplayName();
  }

  getTagline(): string {
    return getVorcaroTagline();
  }

  getToneLabel(tone: VorcaroTone): string {
    return VORCARO_TONE_LABELS[tone];
  }

  getToneIntensity(tone: VorcaroTone): number {
    return getToneIntensity(tone);
  }

  async getUserTone(userId: string): Promise<VorcaroTone> {
    return this.preferences.getTone(userId);
  }

  async updateUserTone(userId: string, tone: VorcaroTone): Promise<VorcaroTone> {
    return this.preferences.updateTone(userId, tone);
  }

  buildSystemPrompt(options: VorcaroTone | VorcaroSystemPromptOptions): string {
    return this.systemPrompt.build(options);
  }

  private async loadTemplateContext(userId: string) {
    const since = new Date();
    since.setDate(since.getDate() - VORCARO_TEMPLATE_COOLDOWN_DAYS);

    const [recent, blockedInWindow] = await Promise.all([
      this.history.findRecentByUser(userId, VORCARO_RECENT_TEMPLATE_LIMIT),
      this.history.findUsedTemplateIdsSince(userId, since),
    ]);

    return {
      recentTemplateIds: recent.map((r) => r.templateId),
      blockedTemplateIds: blockedInWindow,
    };
  }

  resolveEffectiveTone(preferredTone: VorcaroTone, critical?: VorcaroCriticalInput): VorcaroTone {
    if (!critical) return preferredTone;
    return this.guardrail.resolveEffectiveTone(preferredTone, critical);
  }

  async getEligibleTemplateHintsForLlm(input: {
    userId: string;
    category: VorcaroTemplateCategory;
    tone: VorcaroTone;
  }): Promise<string[]> {
    const context = await this.loadTemplateContext(input.userId);
    const eligible = this.selector.selectEligibleForLlm(input.category, input.tone, context);
    return eligible
      .map((t) => this.selector.resolveObservation(t, input.tone))
      .filter((text): text is string => Boolean(text));
  }

  async buildLlmPromptContext(input: {
    userId: string;
    category: VorcaroTemplateCategory;
    criticalContext?: VorcaroCriticalInput;
  }): Promise<VorcaroLlmPromptContext> {
    const preferredTone = await this.preferences.getTone(input.userId);
    const effectiveTone = this.resolveEffectiveTone(preferredTone, input.criticalContext);
    const mood = this.moodResolver.resolve(input.criticalContext ?? {});
    const templateHints = await this.getEligibleTemplateHintsForLlm({
      userId: input.userId,
      category: input.category,
      tone: effectiveTone,
    });

    const system = this.systemPrompt.build({
      tone: effectiveTone,
      preferredTone,
      mood,
      templateHints,
      guardrailInstruction: this.guardrail.buildGuardrailInstruction(preferredTone, effectiveTone),
    });

    return { preferredTone, effectiveTone, system, category: input.category };
  }

  inferCategoryFromCriticalContext(critical?: VorcaroCriticalInput): VorcaroTemplateCategory {
    if (critical?.negativeCashflowDays != null) return "NEGATIVE_CASHFLOW";
    if ((critical?.overdueReceivableAmount ?? 0) > 0) return "OVERDUE_RECEIVABLE";
    if ((critical?.goalsAtRisk ?? 0) > 0) return "GOAL_AT_RISK";
    if ((critical?.savingsOpportunityMonthly ?? 0) > 0) return "MONEY_LEAK";
    if ((critical?.highCommitmentPercent ?? 0) >= 85) return "HIGH_COMMITMENT";
    return "GENERAL";
  }

  async compose(input: VorcaroMessageInput): Promise<VorcaroStructuredMessage> {
    const preferredTone = input.tone ?? (await this.preferences.getTone(input.userId));
    const effectiveTone = this.resolveEffectiveTone(preferredTone, input.criticalContext);
    const mood = this.moodResolver.resolve(input.criticalContext ?? {});
    const context = await this.loadTemplateContext(input.userId);

    const template =
      this.selector.select(input.category, effectiveTone, context) ??
      this.selector.select(input.category, effectiveTone, {
        recentTemplateIds: [],
        blockedTemplateIds: [],
      });

    let observation = template
      ? this.selector.resolveObservation(template, effectiveTone)
      : undefined;

    if (mood.hint && effectiveTone !== preferredTone) {
      observation = mood.hint;
    } else if (mood.hint && mood.mood === "CONCERNED" && !observation) {
      observation = mood.hint;
    }

    const structured = this.formatter.format({
      fact: input.fact,
      impact: input.impact,
      action: input.action,
      observation,
      tone: effectiveTone,
      templateId: template?.id ?? `${input.category.toLowerCase()}-fallback`,
      category: input.category,
      archetype: template?.archetype ?? "CFO",
    });

    if (template) {
      await this.history.record({
        userId: input.userId,
        templateId: template.id,
        category: input.category,
      });
    }

    return structured;
  }

  async composeText(input: VorcaroMessageInput): Promise<string> {
    const message = await this.compose(input);
    return message.formatted;
  }

  async composeCompactText(input: VorcaroMessageInput): Promise<string> {
    const message = await this.compose(input);
    const mood = this.moodResolver.resolve(input.criticalContext ?? {});
    const lines: string[] = [];
    if (mood.hint && mood.mood !== "NORMAL") {
      lines.push(mood.hint);
    }
    lines.push(
      this.formatter.formatCompact({
        fact: message.fact,
        impact: message.impact,
        action: message.action,
        observation: message.observation,
        tone: message.tone,
        templateId: message.templateId,
        category: message.category,
        archetype: message.archetype,
      }),
    );
    return lines.join("\n\n");
  }

  resolveCategoryFromNotificationType(type: NotificationType): VorcaroTemplateCategory {
    return NOTIFICATION_TYPE_TO_CATEGORY[type] ?? "GENERAL";
  }

  async enhanceNotificationMessage(input: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string | null;
    category?: VorcaroTemplateCategory;
    criticalContext?: VorcaroCriticalInput;
  }): Promise<string> {
    const category = input.category ?? this.resolveCategoryFromNotificationType(input.type);
    const action =
      input.actionUrl != null && input.actionUrl.length > 0
        ? `Acesse ${input.actionUrl} para agir agora.`
        : "Revise esta área no dashboard e defina o próximo passo.";

    return this.composeCompactText({
      userId: input.userId,
      category,
      fact: input.title,
      impact: input.message,
      action,
      criticalContext: input.criticalContext,
    });
  }

  async buildDigestHeader(userId: string, kind: "daily" | "weekly"): Promise<string> {
    const tone = await this.preferences.getTone(userId);
    const label = kind === "daily" ? "Resumo diário" : "Resumo semanal";
    return `${label} — ${getVorcaroDisplayName()} (${this.getToneLabel(tone)})`;
  }
}
