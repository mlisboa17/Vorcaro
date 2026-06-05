import { describe, expect, it } from "vitest";
import { VorcaroConversationContextService } from "../application/services/vorcaro-conversation-context.service";
import { VorcaroConversationMemoryService } from "../application/services/vorcaro-conversation-memory.service";
import { VorcaroHumanizationGuard } from "../application/services/vorcaro-humanization-guard.service";
import { VorcaroResponseCriticService } from "../application/services/vorcaro-response-critic.service";
import { VorcaroIntentEngineService } from "@/modules/vorcaro/intent/application/services/vorcaro-intent-engine.service";
import { VorcaroIntentResponseFormatter } from "@/modules/vorcaro/intent/application/services/vorcaro-intent-response-formatter.service";

const memory = new VorcaroConversationMemoryService();
const contextService = new VorcaroConversationContextService();
const critic = new VorcaroResponseCriticService();
const humanization = new VorcaroHumanizationGuard();
const intentEngine = new VorcaroIntentEngineService();
const formatter = new VorcaroIntentResponseFormatter();

function resolveContext(
  message: string,
  previousTopic: string | null,
  lastIntent: "CATEGORY_LIST" | "CATEGORY_AUDIT" | "CARD_LIST" | null = null,
) {
  return contextService.resolve({
    message,
    previousTopic,
    lastIntent,
    detectTopic: (m, p) => memory.detectTopic(m, p),
  });
}

describe("Sprint 14.9.2 — cenários conversacionais", () => {
  it("Caso 1: após categorias, melhorar cadastro mantém CATEGORY_AUDIT", () => {
    const listContext = resolveContext("Mostre minhas categorias", null);
    expect(listContext.currentTopic).toBe("categories");

    const followUp = resolveContext(
      "Pode melhorar esse cadastro?",
      "categories",
      "CATEGORY_LIST",
    );
    expect(followUp.topicLocked).toBe(true);
    expect(followUp.lockedIntent).toBe("CATEGORY_AUDIT");

    const detection = intentEngine.detect("Pode melhorar esse cadastro?", "categories", {
      lockedIntent: followUp.lockedIntent,
    });
    expect(detection.primary).toBe("CATEGORY_AUDIT");
    expect(detection.primary).not.toBe("CASHFLOW");
  });

  it("Caso 2: resposta de cartões não pode mencionar fluxo de caixa", () => {
    const context = resolveContext("Quais cartões tenho?", null);
    const critique = critic.critique({
      userMessage: "Quais cartões tenho?",
      context,
      selectedIntent: "CARD_LIST",
      selectedTools: ["card_list"],
      generatedResponse: "Seu fluxo de caixa ficará negativo em 1 dia.",
    });
    expect(critique.approved).toBe(false);
    expect(critique.issues).toContain("irrelevant_cashflow_in_cards_context");
  });

  it("Caso 3: auditoria de categorias sem FATO/IMPACTO/AÇÃO", () => {
    const robotic =
      "**FATO** — Resumo\n\n**IMPACTO** —\n- confiança 94%\n\n**AÇÃO** —\n- Ajustar";
    const cleaned = humanization.sanitize(robotic, "CATEGORY_AUDIT");
    expect(cleaned.text).not.toMatch(/\*\*FATO\*\*|\*\*IMPACTO\*\*|\*\*AÇÃO\*\*/);
    expect(cleaned.text).not.toMatch(/confian[cç]a\s*94%/i);

    const formatted = formatter.format([
      {
        intent: "CATEGORY_AUDIT",
        title: "Categorias",
        summary: "Sua estrutura geral está boa.",
        facts: [],
        metrics: {},
        recommendations: [],
      },
    ]);
    expect(formatted).not.toMatch(/\*\*FATO\*\*/);
  });

  it("Caso 4: listar categorias usa CATEGORY_LIST", () => {
    expect(intentEngine.detect("Liste minhas categorias").primary).toBe("CATEGORY_LIST");
    const listResponse = formatter.format([
      {
        intent: "CATEGORY_LIST",
        title: "Suas categorias",
        summary: "Aqui estão suas categorias ativas:\n\n• Alimentação",
        facts: [],
        metrics: {},
        recommendations: [],
      },
    ]);
    expect(listResponse).not.toMatch(/Os principais são|auditoria/i);
    expect(listResponse).toContain("Alimentação");
  });

  it("bloqueia troca de contexto quando topic lock está ativo", () => {
    const context = resolveContext("Vale a pena melhorar?", "categories", "CATEGORY_LIST");
    const critique = critic.critique({
      userMessage: "Vale a pena melhorar?",
      context,
      selectedIntent: "CASHFLOW",
      selectedTools: ["cashflow_projection"],
      generatedResponse: "Seu fluxo de caixa ficará negativo em 1 dia.",
    });
    expect(critique.suggestedIntent).toBe("CATEGORY_AUDIT");
    expect(critique.issues).toContain("context_switch_blocked");
  });
});
