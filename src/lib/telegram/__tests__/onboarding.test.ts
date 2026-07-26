import { describe, expect, it } from "vitest";
import {
  buildWelcomeKeyboard,
  buildPaymentStepKeyboard,
  inferAccountType,
  inferPaymentType,
  needsAccount,
  needsOnboarding,
  parseOnboardingCallback,
  validateAccountName,
  validatePaymentName,
} from "@/lib/telegram/onboarding";

describe("needsOnboarding / needsAccount (17.1)", () => {
  it("exige onboarding sem conta ou sem forma de pagamento", () => {
    expect(needsOnboarding(0, 0)).toBe(true);
    expect(needsOnboarding(0, 2)).toBe(true);
    expect(needsOnboarding(1, 0)).toBe(true);
    expect(needsOnboarding(1, 1)).toBe(false);
  });

  it("needsAccount só olha contas", () => {
    expect(needsAccount(0)).toBe(true);
    expect(needsAccount(1)).toBe(false);
  });
});

describe("validateAccountName (17.1)", () => {
  it("aceita nome válido e apara p/ 60 chars", () => {
    expect(validateAccountName("Nubank")).toEqual({ ok: true, name: "Nubank" });
    expect(validateAccountName("  Conta Corrente  ")).toEqual({ ok: true, name: "Conta Corrente" });
    const long = "x".repeat(80);
    const res = validateAccountName(long);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.name.length).toBe(60);
  });

  it("rejeita vazio, curto, cancelar e comando", () => {
    expect(validateAccountName("")).toEqual({ ok: false, reason: "empty" });
    expect(validateAccountName("   ")).toEqual({ ok: false, reason: "empty" });
    expect(validateAccountName("a")).toEqual({ ok: false, reason: "too_short" });
    expect(validateAccountName("cancelar")).toEqual({ ok: false, reason: "cancel" });
    expect(validateAccountName("CANCELAR")).toEqual({ ok: false, reason: "cancel" });
    expect(validateAccountName("/start")).toEqual({ ok: false, reason: "command" });
  });
});

describe("inferAccountType (17.1)", () => {
  it("infere CASH para carteira/dinheiro", () => {
    expect(inferAccountType("Carteira")).toBe("CASH");
    expect(inferAccountType("Dinheiro vivo")).toBe("CASH");
    expect(inferAccountType("caixinha")).toBe("CASH");
  });

  it("infere SAVINGS e INVESTMENT", () => {
    expect(inferAccountType("Poupança")).toBe("SAVINGS");
    expect(inferAccountType("Corretora XP")).toBe("INVESTMENT");
  });

  it("default CHECKING para bancos/contas comuns", () => {
    expect(inferAccountType("Nubank")).toBe("CHECKING");
    expect(inferAccountType("Conta Corrente")).toBe("CHECKING");
  });
});

describe("validatePaymentName (17.2)", () => {
  it("aceita nome válido e apara p/ 60 chars", () => {
    expect(validatePaymentName("Pix")).toEqual({ ok: true, name: "Pix" });
    expect(validatePaymentName("  Cartão de crédito  ")).toEqual({ ok: true, name: "Cartão de crédito" });
    const res = validatePaymentName("y".repeat(80));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.name.length).toBe(60);
  });

  it("rejeita vazio, curto, cancelar e comando", () => {
    expect(validatePaymentName("")).toEqual({ ok: false, reason: "empty" });
    expect(validatePaymentName("x")).toEqual({ ok: false, reason: "too_short" });
    expect(validatePaymentName("cancelar")).toEqual({ ok: false, reason: "cancel" });
    expect(validatePaymentName("/start")).toEqual({ ok: false, reason: "command" });
  });
});

describe("inferPaymentType (17.2)", () => {
  it("infere PIX, crédito, débito", () => {
    expect(inferPaymentType("Pix")).toBe("PIX");
    expect(inferPaymentType("Cartão de crédito")).toBe("CREDIT_CARD");
    expect(inferPaymentType("Cartão de débito")).toBe("DEBIT_CARD");
  });

  it("'cartão' sem qualificador → crédito; dinheiro → CASH", () => {
    expect(inferPaymentType("Cartão")).toBe("CREDIT_CARD");
    expect(inferPaymentType("Dinheiro")).toBe("CASH");
    expect(inferPaymentType("espécie")).toBe("CASH");
  });

  it("infere boleto, transferência e default OTHER", () => {
    expect(inferPaymentType("Boleto")).toBe("BOLETO");
    expect(inferPaymentType("Transferência TED")).toBe("BANK_TRANSFER");
    expect(inferPaymentType("Cheque")).toBe("OTHER");
  });
});

describe("callbacks e teclados (17.1)", () => {
  it("parseia callbacks de onboarding", () => {
    expect(parseOnboardingCallback("onb_account")).toBe("account");
    expect(parseOnboardingCallback("onb_payment")).toBe("payment");
    expect(parseOnboardingCallback("cog_ack:x")).toBeNull();
  });

  it("monta teclados de welcome e passo de pagamento", () => {
    expect(buildWelcomeKeyboard()[0][0]).toEqual({ text: "➕ Cadastrar conta", callback_data: "onb_account" });
    expect(buildPaymentStepKeyboard()[0][0]).toEqual({
      text: "➕ Cadastrar forma de pagamento",
      callback_data: "onb_payment",
    });
  });
});
