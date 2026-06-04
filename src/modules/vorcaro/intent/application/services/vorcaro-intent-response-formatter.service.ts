import type { VorcaroToolResult } from "../../domain/types/vorcaro-intent";

export class VorcaroIntentResponseFormatter {
  format(results: VorcaroToolResult[], primaryTitle?: string): string {
    if (results.length === 0) {
      return "Não encontrei dados suficientes para esta consulta.";
    }

    const sections: string[] = [];

    if (results.length === 1) {
      sections.push(this.formatSingle(results[0]));
      return sections.join("\n");
    }

    const headline = primaryTitle ?? results[0].title;
    sections.push(`**${headline}**`, "");

    for (const result of results) {
      sections.push(`### ${result.title}`, "", `**FATO** — ${result.summary}`, "");
      if (result.facts.length > 0) {
        sections.push("**IMPACTO** —", ...result.facts.map((f) => `- ${f}`), "");
      }
      if (result.recommendations.length > 0) {
        sections.push("**AÇÃO** —", ...result.recommendations.map((r) => `- ${r}`), "");
      }
    }

    return sections.join("\n").trim();
  }

  private formatSingle(result: VorcaroToolResult): string {
    const lines = [
      `**FATO** — ${result.summary}`,
      "",
      "**IMPACTO** —",
    ];

    if (result.facts.length > 0) {
      lines.push(...result.facts.map((f) => `- ${f}`));
    } else {
      lines.push("- Sem detalhes adicionais.");
    }

    lines.push("", "**AÇÃO** —");
    if (result.recommendations.length > 0) {
      lines.push(...result.recommendations.map((r) => `- ${r}`));
    } else {
      lines.push("- Revise o dashboard para próximos passos.");
    }

    return lines.join("\n");
  }
}
