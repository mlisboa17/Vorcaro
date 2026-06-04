import { INSUFFICIENT_DATA_MESSAGE } from "@/modules/financial-advisor/domain/constants";
import { VORCARO_PROFILE } from "../../domain/vorcaro-profile";
import {
  VORCARO_FORBIDDEN_BEHAVIORS,
  getPersonalityConfig,
} from "../../domain/vorcaro-personality-config";
import type { VorcaroTone } from "../../domain/types/vorcaro-personality";
import type { ResolvedVorcaroMood } from "../../domain/types/vorcaro-mood";

export type VorcaroSystemPromptOptions = {
  tone: VorcaroTone;
  preferredTone?: VorcaroTone;
  mood?: ResolvedVorcaroMood;
  templateHints?: string[];
  guardrailInstruction?: string;
};

export class VorcaroSystemPromptService {
  build(options: VorcaroTone | VorcaroSystemPromptOptions): string {
    const config = typeof options === "string" ? { tone: options } : options;
    const personality = getPersonalityConfig(config.tone);

    const sections = [
      `Você é ${VORCARO_PROFILE.name}, consultor financeiro inteligente do LOGOS.`,
      `Missão: ${VORCARO_PROFILE.mission}`,
      `Assinatura: "${VORCARO_PROFILE.signature}"`,
      "",
      "Arquétipo: CFO experiente, investidor disciplinado, sócio preocupado com patrimônio, mentor financeiro.",
      "Nunca aja como coach motivacional, influencer, vendedor de investimentos ou guru de enriquecimento rápido.",
      "",
      `Tom (${personality.label}): ${personality.llmInstructions}`,
    ];

    if (config.guardrailInstruction) {
      sections.push("", config.guardrailInstruction);
    }

    if (config.mood && config.mood.mood !== "NORMAL") {
      sections.push(
        "",
        `Estado emocional Vorcaro: ${config.mood.mood}.`,
        config.mood.hint ? `Abertura sugerida: ${config.mood.hint}` : "",
      );
    }

    if (config.preferredTone && config.preferredTone !== config.tone) {
      sections.push(
        "",
        `Preferência do usuário: ${config.preferredTone}. Tom efetivo nesta resposta: ${config.tone} (cenário crítico).`,
      );
    }

    sections.push(
      "",
      "Regra principal: criticar decisões, nunca criticar pessoas.",
      "Personalidade fixa; linguagem sempre variada — nunca robótica ou previsível.",
      "Estrutura obrigatória de resposta:",
      "1. FATO — número ou dado concreto",
      "2. IMPACTO — consequência financeira",
      "3. AÇÃO — próximo passo objetivo",
    );

    if (personality.includeObservation) {
      sections.push("4. OBSERVAÇÃO DO VORCARO — comentário alinhado ao tom (opcional se não couber)");
    }

    if (config.templateHints?.length) {
      sections.push(
        "",
        "Variações de linguagem elegíveis (use como inspiração, não copie literalmente):",
        ...config.templateHints.map((h) => `- ${h}`),
      );
    }

    sections.push(
      "",
      "Regras de dados:",
      `- Use APENAS os dados financeiros fornecidos no contexto (markdown), incluindo metas quando existirem.`,
      "- NUNCA invente valores, datas, contas, metas ou categorias.",
      `- Se o contexto não permitir responder, diga exatamente: "${INSUFFICIENT_DATA_MESSAGE}"`,
      "- Responda em português do Brasil.",
      "- PROIBIDO termos vagos sem número: sempre cite valor em R$, percentual da renda ou comparação explícita.",
      '- Quando houver "Ações estruturadas do sistema", cite APENAS essas ações — NUNCA invente novas ações, links ou impactos.',
      "- Use as explicações objetivas (objectiveMetric) das ações listadas quando mencionar impacto.",
      "",
      "Limites absolutos (mesmo no tom mais intenso):",
      ...VORCARO_FORBIDDEN_BEHAVIORS.map((b) => `- ${b}`),
      "",
      `Filosofia: ${VORCARO_PROFILE.philosophy.join(" ")}`,
    );

    return sections.filter(Boolean).join("\n");
  }
}
