import type { PrismaClient } from "@prisma/client";
import { FinancialDataAggregatorService } from "@/modules/financial-advisor/application/services/financial-data-aggregator.service";
import { IntelligentAdvisorService } from "@/modules/financial-consultant/application/services/intelligent-advisor.service";
import { NotificationQueryService } from "@/modules/notifications/application/services/notification-query.service";
import { FinancialMemoryQueryService } from "@/modules/financial-memory/application/services/financial-memory-query.service";
import {
  VORCARO_CONTEXT_CACHE_TTL_MS,
  type VorcaroChatTopic,
} from "../../domain/types/vorcaro-conversation";

export type VorcaroAggregatedContext = {
  markdown: string;
  usedSources: string[];
  dataScore: number;
  summary: string;
  healthScore: number;
  healthClassification: string;
  criticalAlertCount: number;
  generatedAt: string;
};

type CacheEntry = { value: VorcaroAggregatedContext; expiresAt: number };

const cache = new Map<string, CacheEntry>();

export class VorcaroContextAggregatorService {
  private readonly financialAggregator: FinancialDataAggregatorService;
  private readonly consultant: IntelligentAdvisorService;
  private readonly notifications: NotificationQueryService;
  private readonly financialMemory: FinancialMemoryQueryService;

  constructor(private readonly prisma: PrismaClient) {
    this.financialAggregator = new FinancialDataAggregatorService(prisma);
    this.consultant = new IntelligentAdvisorService(prisma);
    this.notifications = new NotificationQueryService(prisma);
    this.financialMemory = new FinancialMemoryQueryService(prisma);
  }

  async aggregate(userId: string, topic?: VorcaroChatTopic | null): Promise<VorcaroAggregatedContext> {
    const cacheKey = `${userId}:${topic ?? "all"}`;
    const hit = cache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) return hit.value;

    const [base, consultation, notificationSummary, memoryTrends] = await Promise.all([
      this.financialAggregator.aggregate(userId),
      this.consultant.consult(userId),
      this.notifications.getSummary(userId).catch(() => ({ unreadCount: 0, byStatus: {} })),
      this.financialMemory.getTrendsSummary(userId).catch(() => ({
        hasSufficientHistory: false,
        profile: null,
        summary: "",
      })),
    ]);

    const sections = [base.markdown];

    sections.push(
      "",
      "## Consultor determinístico (somente leitura)",
      consultation.summary,
      `Score de saúde: ${consultation.healthScore.score}/100 (${consultation.healthScore.classification})`,
    );

    if (consultation.risks.length > 0) {
      sections.push(
        "### Riscos",
        ...consultation.risks.slice(0, 8).map((r) => `- [${r.severity}] ${r.title}: ${r.description}`),
      );
    }

    if (consultation.savingsOpportunities.length > 0) {
      sections.push(
        "### Oportunidades de economia",
        ...consultation.savingsOpportunities
          .slice(0, 5)
          .map((s) => `- ${s.title}: ~R$ ${s.estimatedMonthlySavings.toFixed(2)}/mês`),
      );
    }

    if (consultation.moneyLeaks.length > 0) {
      sections.push(
        "### Money Leak Detector",
        ...consultation.moneyLeaks
          .slice(0, 5)
          .map((l) => `- ${l.label}: R$ ${l.monthlyTotal.toFixed(2)}/mês`),
      );
    }

    if (consultation.subscriptionDuplicates.length > 0) {
      sections.push(
        "### Subscription Detector",
        ...consultation.subscriptionDuplicates
          .slice(0, 5)
          .map((d) => `- ${d.brand}: R$ ${d.monthlyTotal.toFixed(2)}/mês duplicado`),
      );
    }

    sections.push(
      "",
      "## Central de Notificações",
      `- Não lidas: ${notificationSummary.unreadCount ?? 0}`,
    );

    sections.push(
      "",
      "## Memória financeira longitudinal (Sprint 12)",
      memoryTrends.hasSufficientHistory
        ? memoryTrends.summary
        : "Histórico insuficiente para análise comparativa (< 30 dias).",
    );

    if (topic === "cashflow" && consultation.risks.some((r) => r.id === "risk-cashflow")) {
      sections.push("", "### Foco: fluxo de caixa", consultation.summary);
    }

    const usedSources = [
      ...new Set([
        ...base.usedSources,
        "consultor_deterministico",
        "notificacoes",
        "money_leak_detector",
        "subscription_detector",
        "financial_memory",
      ]),
    ];

    const dataScore = base.dataScore + (consultation.healthScore.score > 0 ? 2 : 0);
    const value: VorcaroAggregatedContext = {
      markdown: sections.join("\n"),
      usedSources,
      dataScore,
      summary: consultation.summary,
      healthScore: consultation.healthScore.score,
      healthClassification: consultation.healthScore.classification,
      criticalAlertCount: consultation.risks.filter((r) => r.severity === "critical").length,
      generatedAt: new Date().toISOString(),
    };

    cache.set(cacheKey, { value, expiresAt: Date.now() + VORCARO_CONTEXT_CACHE_TTL_MS });
    return value;
  }

  static clearCache(userId?: string) {
    if (!userId) {
      cache.clear();
      return;
    }
    for (const key of cache.keys()) {
      if (key.startsWith(`${userId}:`)) cache.delete(key);
    }
  }
}
