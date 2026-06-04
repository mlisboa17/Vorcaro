import type { VorcaroTemplateEntry } from "../../domain/vorcaro-template-library";
import { getTemplatesByCategory } from "../../domain/vorcaro-template-library";
import type { VorcaroArchetype, VorcaroTemplateCategory, VorcaroTone } from "../../domain/types/vorcaro-personality";

export const VORCARO_RECENT_TEMPLATE_LIMIT = 50;
export const VORCARO_TEMPLATE_COOLDOWN_DAYS = 30;
export const VORCARO_LLM_TEMPLATE_POOL_SIZE = 5;
export const VORCARO_LLM_TEMPLATE_MIN = 3;

export type TemplateSelectionContext = {
  recentTemplateIds: string[];
  blockedTemplateIds: string[];
  preferredArchetypes?: VorcaroArchetype[];
};

export class VorcaroTemplateSelectorService {
  select(
    category: VorcaroTemplateCategory,
    tone: VorcaroTone,
    context: TemplateSelectionContext,
  ): VorcaroTemplateEntry | null {
    const candidates = getTemplatesByCategory(category);
    if (candidates.length === 0) return null;

    const blocked = new Set([
      ...context.recentTemplateIds.slice(0, VORCARO_RECENT_TEMPLATE_LIMIT),
      ...context.blockedTemplateIds,
    ]);

    const withObservation = candidates.filter(
      (t) => t.observations[tone] && !blocked.has(t.id),
    );
    const pool = withObservation.length > 0 ? withObservation : candidates.filter((t) => t.observations[tone]);

    if (pool.length === 0) {
      return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
    }

    const unused = pool.filter((t) => !blocked.has(t.id));
    const archetypePool = this.prioritizeArchetypes(unused.length > 0 ? unused : pool, context.preferredArchetypes);

    const index = Math.floor(Math.random() * archetypePool.length);
    return archetypePool[index] ?? null;
  }

  private prioritizeArchetypes(
    pool: VorcaroTemplateEntry[],
    preferred?: VorcaroArchetype[],
  ): VorcaroTemplateEntry[] {
    if (!preferred?.length) return pool;
    for (const archetype of preferred) {
      const match = pool.filter((t) => t.archetype === archetype);
      if (match.length > 0) return match;
    }
    return pool;
  }

  resolveObservation(template: VorcaroTemplateEntry, tone: VorcaroTone): string | undefined {
    const fallbackOrder: VorcaroTone[] = [
      tone,
      "BALANCED",
      "DIRECT",
      "PROFESSIONAL",
      "VORCARO",
      "IMPACT",
      "REALITY_AUDITOR",
    ];
    for (const candidate of fallbackOrder) {
      const text = template.observations[candidate];
      if (text) return text;
    }
    return Object.values(template.observations)[0];
  }

  /**
   * Seleciona 3–5 templates elegíveis para o LLM (nunca a biblioteca completa).
   */
  selectEligibleForLlm(
    category: VorcaroTemplateCategory,
    tone: VorcaroTone,
    context: TemplateSelectionContext,
    poolSize = VORCARO_LLM_TEMPLATE_POOL_SIZE,
  ): VorcaroTemplateEntry[] {
    const candidates = getTemplatesByCategory(category);
    if (candidates.length === 0) return [];

    const blocked = new Set([
      ...context.recentTemplateIds.slice(0, VORCARO_RECENT_TEMPLATE_LIMIT),
      ...context.blockedTemplateIds,
    ]);

    const withTone = candidates.filter((t) => this.resolveObservation(t, tone));
    const eligible = withTone.filter((t) => !blocked.has(t.id));
    const pool = eligible.length >= VORCARO_LLM_TEMPLATE_MIN ? eligible : withTone;

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const size = Math.min(
      poolSize,
      Math.max(VORCARO_LLM_TEMPLATE_MIN, Math.min(shuffled.length, poolSize)),
    );
    return shuffled.slice(0, size);
  }
}
