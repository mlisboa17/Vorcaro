import type { AdvisorAction } from "../../domain/types/advisor-action";

const VAGUE_PATTERNS = [
  /\bmuito alto\b/i,
  /\balto demais\b/i,
  /\bexagerou\b/i,
  /\bgasta muito\b/i,
  /\bestá alto\b/i,
];

export class AdvisorLanguageGuardrailService {
  /**
   * Se a resposta do LLM for vaga, anexa explicações objetivas das ações oficiais.
   */
  enrichAnswerWithObjectiveMetrics(answer: string, actions: AdvisorAction[]): string {
    if (!VAGUE_PATTERNS.some((p) => p.test(answer))) {
      return answer;
    }

    const block = actions
      .filter((a) => a.objectiveMetric?.explanation)
      .slice(0, 5)
      .map((a) => `- ${a.objectiveMetric!.explanation}`)
      .join("\n");

    if (!block) return answer;

    return `${answer.trim()}\n\n**Dados objetivos do consultor:**\n${block}`;
  }
}
