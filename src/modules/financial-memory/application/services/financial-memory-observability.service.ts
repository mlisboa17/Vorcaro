import type { FinancialMemoryObservabilitySnapshot } from "../../domain/types/financial-memory";

export class FinancialMemoryObservabilityService {
  private metrics: FinancialMemoryObservabilitySnapshot = {
    timeline_events_created: 0,
    evolution_queries: 0,
    achievement_unlocked: 0,
    trend_detected: 0,
  };

  recordTimelineEventsCreated(count = 1): void {
    this.metrics.timeline_events_created += count;
  }

  recordEvolutionQuery(): void {
    this.metrics.evolution_queries += 1;
  }

  recordAchievementUnlocked(count = 1): void {
    this.metrics.achievement_unlocked += count;
  }

  recordTrendDetected(): void {
    this.metrics.trend_detected += 1;
  }

  snapshot(): FinancialMemoryObservabilitySnapshot {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      timeline_events_created: 0,
      evolution_queries: 0,
      achievement_unlocked: 0,
      trend_detected: 0,
    };
  }
}

export const financialMemoryObservability = new FinancialMemoryObservabilityService();
