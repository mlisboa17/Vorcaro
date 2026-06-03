import { describe, expect, it } from "vitest";
import { detectReceivableTelegramHint } from "@/lib/telegram/detect-receivable-hint";
import { isThirdPartyExpenseTransaction } from "@/lib/financial/receivable-transaction-metadata";

describe("detectReceivableTelegramHint", () => {
  it("detecta compra para terceiro sem efetivar", () => {
    const hint = detectReceivableTelegramHint("Comprei R$ 800 para João");
    expect(hint.detected).toBe(true);
    expect(hint.devedorNome).toBe("João");
    expect(hint.amount).toBe(800);
    expect(hint.message).toMatch(/nada foi criado automaticamente/i);
  });

  it("ignora mensagens comuns", () => {
    expect(detectReceivableTelegramHint("Almoço 45 reais").detected).toBe(false);
  });
});

describe("isThirdPartyExpenseTransaction", () => {
  it("identifica metadata de compra para terceiro", () => {
    expect(
      isThirdPartyExpenseTransaction({ thirdPartyPurchase: true, receivableId: "recv_1" }),
    ).toBe(true);
    expect(isThirdPartyExpenseTransaction({})).toBe(false);
  });
});
