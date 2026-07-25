import { describe, expect, it } from "vitest";
import { detectIncomeVerb } from "@/lib/telegram/detect-income-hint";

describe("detectIncomeVerb (16.2)", () => {
  it("detecta verbos claros de entrada", () => {
    expect(detectIncomeVerb("recebi 500 do cliente X")).toBe(true);
    expect(detectIncomeVerb("Ganhei 200 de bônus")).toBe(true);
    expect(detectIncomeVerb("depósito de 1000 na conta")).toBe(true);
    expect(detectIncomeVerb("pix recebido de 350")).toBe(true);
    expect(detectIncomeVerb("caiu 800 no pix hoje")).toBe(true);
    expect(detectIncomeVerb("salário 4500")).toBe(true);
    expect(detectIncomeVerb("vendi a bike por 900")).toBe(true);
  });

  it("não confunde despesas com receita", () => {
    expect(detectIncomeVerb("paguei 50 no mercado")).toBe(false);
    expect(detectIncomeVerb("gastei 120 no posto")).toBe(false);
    expect(detectIncomeVerb("comprei um livro 40,00")).toBe(false);
    expect(detectIncomeVerb("Mercado Extra 75,00")).toBe(false);
  });

  it("verbo de saída cancela a heurística de receita (frase mista)", () => {
    // "recebi a fatura e paguei" — o pagamento predomina, não é receita.
    expect(detectIncomeVerb("recebi a fatura e paguei 300")).toBe(false);
  });

  it("trata entradas vazias com segurança", () => {
    expect(detectIncomeVerb("")).toBe(false);
    expect(detectIncomeVerb(null)).toBe(false);
    expect(detectIncomeVerb(undefined)).toBe(false);
  });
});
