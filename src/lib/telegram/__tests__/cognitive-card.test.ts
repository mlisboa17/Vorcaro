import { describe, expect, it } from "vitest";
import { formatCognitiveCardText } from "@/lib/telegram/cognitive-card";
import { parseTelegramAmount } from "@/modules/telegram/application/process-telegram-update.service";

describe("formatCognitiveCardText (16.1.2)", () => {
  it("formata despesa com local, valor e tipo", () => {
    const text = formatCognitiveCardText({
      description: "Mercado Extra",
      amount: 75,
      date: "2026-06-05",
      type: "EXPENSE",
    });
    expect(text).toContain("Mercado Extra");
    expect(text).toContain("R$ 75,00");
    expect(text).toContain("Despesa");
    expect(text).toContain("Confirma os dados?");
  });

  it("rotula receita corretamente com header e origem (16.2)", () => {
    const text = formatCognitiveCardText({ description: "Cliente X", amount: 500, type: "INCOME" });
    expect(text).toContain("Receita");
    expect(text).toContain("R$ 500,00");
    expect(text).toContain("Entrada detectada");
    expect(text).toContain("<b>Origem:</b> Cliente X");
    expect(text).not.toContain("Estabelecimento");
  });

  it("despesa mantém header e rótulo de estabelecimento", () => {
    const text = formatCognitiveCardText({ description: "Posto BR", amount: 100, type: "EXPENSE" });
    expect(text).toContain("Lançamento Inteligente Detectado");
    expect(text).toContain("<b>Estabelecimento:</b> Posto BR");
    expect(text).not.toContain("Origem:");
  });

  it("usa placeholders quando faltam campos", () => {
    const text = formatCognitiveCardText({ amount: null, description: null, date: null });
    expect(text).toContain("R$ 0,00");
    expect(text).toContain("—");
  });

  it("mostra a linha de categoria quando informada (16.1.4)", () => {
    const withCat = formatCognitiveCardText({ description: "X", amount: 10, type: "EXPENSE" }, "Alimentação → Restaurantes");
    expect(withCat).toContain("<b>Categoria:</b> Alimentação → Restaurantes");
  });

  it("omite a linha de categoria quando ausente", () => {
    const noCat = formatCognitiveCardText({ description: "X", amount: 10, type: "EXPENSE" });
    expect(noCat).not.toContain("Categoria:");
  });
});

describe("parseTelegramAmount (16.1.2)", () => {
  it("aceita valores pt-BR", () => {
    expect(parseTelegramAmount("75,00")).toBe(75);
    expect(parseTelegramAmount("R$ 1.250,50")).toBe(1250.5);
    expect(parseTelegramAmount("80")).toBe(80);
    expect(parseTelegramAmount("  99,90 ")).toBe(99.9);
  });

  it("rejeita entradas inválidas", () => {
    expect(parseTelegramAmount("abc")).toBeNull();
    expect(parseTelegramAmount("")).toBeNull();
    expect(parseTelegramAmount("0")).toBeNull();
    expect(parseTelegramAmount("-50")).toBeNull();
  });
});
