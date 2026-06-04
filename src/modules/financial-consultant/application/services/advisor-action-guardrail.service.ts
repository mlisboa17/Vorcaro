import { ADVISOR_ACTION_TYPES } from "../../domain/types/advisor-action";
import type { AdvisorAction, AdvisorActionType } from "../../domain/types/advisor-action";

const ACTION_ID_PATTERN = /\b(action[-_][\w-]+|collect-[\w-]+|dup-[\w-]+|goal-[\w-]+|alert-[\w-]+|money-leak|high-commitment|spend-[\w-]+)\b/gi;

export type GuardrailResult = {
  actions: AdvisorAction[];
  sanitizedAnswer?: string;
  removedInventedReferences: string[];
};

export class AdvisorActionGuardrailService {
  validateActions(actions: AdvisorAction[]): AdvisorAction[] {
    const seen = new Set<string>();
    return actions.filter((action) => {
      if (!action.id?.trim()) return false;
      if (!ADVISOR_ACTION_TYPES.includes(action.type as AdvisorActionType)) return false;
      if (!action.title?.trim() || !action.description?.trim()) return false;
      if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(action.priority)) return false;
      if (!["LOW", "MEDIUM", "HIGH"].includes(action.effort)) return false;
      if (![1, 2, 3].includes(action.effortWeight)) return false;
      if (typeof action.estimatedImpact !== "number") return false;
      if (seen.has(action.id)) return false;
      seen.add(action.id);
      return true;
    });
  }

  /**
   * Remove referências a actionIds que não existem no catálogo oficial.
   * O LLM pode explicar ações listadas, mas não inventar novos IDs.
   */
  sanitizeLlmAnswer(answer: string, officialActions: AdvisorAction[]): string {
    const officialIds = new Set(officialActions.map((a) => a.id.toLowerCase()));
    const allowedTypes = new Set(ADVISOR_ACTION_TYPES);

    let sanitized = answer;

    const citedIds = [...answer.matchAll(ACTION_ID_PATTERN)].map((m) => m[0]);
    const removed: string[] = [];

    for (const cited of citedIds) {
      if (!officialIds.has(cited.toLowerCase())) {
        removed.push(cited);
        const escaped = cited.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        sanitized = sanitized.replace(new RegExp(`[^\\n]*${escaped}[^\\n]*\\n?`, "gi"), "");
      }
    }

    for (const type of ADVISOR_ACTION_TYPES) {
      const inventPattern = new RegExp(
        `(criar|nova|sugiro|recomendo)\\s+(ação|action).*?${type}`,
        "gi",
      );
      if (inventPattern.test(sanitized) && !officialActions.some((a) => a.type === type)) {
        sanitized = sanitized.replace(inventPattern, "");
        removed.push(`invented-type:${type}`);
      }
    }

    for (const token of removed) {
      if (token.startsWith("invented-type:")) {
        const t = token.replace("invented-type:", "") as AdvisorActionType;
        if (!allowedTypes.has(t)) continue;
      }
    }

    return sanitized.replace(/\n{3,}/g, "\n\n").trim();
  }

  apply(input: {
    actions: AdvisorAction[];
    llmAnswer?: string;
  }): GuardrailResult {
    const actions = this.validateActions(input.actions);
    const officialIds = new Set(actions.map((a) => a.id));

    let sanitizedAnswer = input.llmAnswer;
    const removedInventedReferences: string[] = [];

    if (sanitizedAnswer) {
      const before = sanitizedAnswer;
      sanitizedAnswer = this.sanitizeLlmAnswer(sanitizedAnswer, actions);
      const cited = [...before.matchAll(ACTION_ID_PATTERN)].map((m) => m[0]);
      for (const id of cited) {
        if (!officialIds.has(id)) removedInventedReferences.push(id);
      }
    }

    return {
      actions,
      sanitizedAnswer,
      removedInventedReferences,
    };
  }

  /** Valida que actionIds mencionados em metadata extraída existem no array oficial. */
  filterCitedActionIds(citedIds: string[], officialActions: AdvisorAction[]): string[] {
    const official = new Set(officialActions.map((a) => a.id));
    return citedIds.filter((id) => official.has(id));
  }
}
