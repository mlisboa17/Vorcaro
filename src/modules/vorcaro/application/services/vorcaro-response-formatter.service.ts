import { getPersonalityConfig } from "../../domain/vorcaro-personality-config";
import type { VorcaroStructuredMessage, VorcaroTone } from "../../domain/types/vorcaro-personality";
import type { VorcaroArchetype } from "../../domain/types/vorcaro-personality";
import type { VorcaroTemplateCategory } from "../../domain/types/vorcaro-personality";

export type FormatStructuredInput = {
  fact: string;
  impact: string;
  action: string;
  observation?: string;
  tone: VorcaroTone;
  templateId: string;
  category: VorcaroTemplateCategory;
  archetype: VorcaroArchetype;
};

export class VorcaroResponseFormatter {
  format(input: FormatStructuredInput): VorcaroStructuredMessage {
    const config = getPersonalityConfig(input.tone);
    const observation =
      config.includeObservation && input.observation?.trim()
        ? input.observation.trim()
        : undefined;

    const sections = [
      "FATO",
      input.fact.trim(),
      "",
      "IMPACTO",
      input.impact.trim(),
      "",
      "AÇÃO",
      input.action.trim(),
    ];

    if (observation) {
      sections.push("", "OBSERVAÇÃO DO VORCARO", observation);
    }

    return {
      fact: input.fact.trim(),
      impact: input.impact.trim(),
      action: input.action.trim(),
      observation,
      formatted: sections.join("\n"),
      templateId: input.templateId,
      category: input.category,
      tone: input.tone,
      archetype: input.archetype,
    };
  }

  /** Versão compacta para Telegram, digests e cards. */
  formatCompact(input: FormatStructuredInput): string {
    const structured = this.format(input);
    const lines = [structured.fact, structured.impact, structured.action];
    if (structured.observation) {
      lines.push(structured.observation);
    }
    return lines.join("\n\n");
  }
}
