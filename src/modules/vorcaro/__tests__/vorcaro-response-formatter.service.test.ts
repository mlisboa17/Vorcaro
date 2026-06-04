import { describe, expect, it } from "vitest";
import { VorcaroResponseFormatter } from "../application/services/vorcaro-response-formatter.service";

describe("VorcaroResponseFormatter", () => {
  const formatter = new VorcaroResponseFormatter();

  it("formata mensagem com FATO, IMPACTO e AÇÃO", () => {
    const result = formatter.format({
      fact: "R$ 620 em delivery.",
      impact: "Representa 12,4% da renda prevista.",
      action: "Reduzir pela metade libera R$ 3.720/ano.",
      tone: "PROFESSIONAL",
      templateId: "delivery-001",
      category: "DELIVERY",
      archetype: "CFO",
    });

    expect(result.formatted).toContain("FATO");
    expect(result.formatted).toContain("IMPACTO");
    expect(result.formatted).toContain("AÇÃO");
    expect(result.observation).toBeUndefined();
  });

  it("inclui observação quando o tom permite", () => {
    const result = formatter.format({
      fact: "R$ 620 em delivery.",
      impact: "12,4% da renda.",
      action: "Reduza esse gasto.",
      observation: "Seu patrimônio observou esse dinheiro sair.",
      tone: "VORCARO",
      templateId: "delivery-001",
      category: "DELIVERY",
      archetype: "INVESTOR",
    });

    expect(result.formatted).toContain("OBSERVAÇÃO DO VORCARO");
    expect(result.observation).toContain("patrimônio");
  });

  it("gera versão compacta sem rótulos", () => {
    const compact = formatter.formatCompact({
      fact: "Assinatura duplicada.",
      impact: "Dois pagamentos, um serviço.",
      action: "Cancele uma assinatura.",
      tone: "DIRECT",
      templateId: "duplicate_streaming-001",
      category: "DUPLICATE_STREAMING",
      archetype: "AUDITOR",
    });

    expect(compact).not.toContain("FATO");
    expect(compact).toContain("Assinatura duplicada.");
  });
});
