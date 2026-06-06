import { describe, expect, it } from "vitest";
import { maskFileName, maskSensitiveText } from "../homologation/real-bank/real-bank-privacy.service";

describe("real bank privacy masking", () => {
  it("mascara CPF e CNPJ em texto", () => {
    const masked = maskSensitiveText("Titular CPF 123.456.789-00 CNPJ 12.345.678/0001-99");
    expect(masked).not.toContain("123.456.789-00");
    expect(masked).not.toContain("12.345.678/0001-99");
  });

  it("mascara agência/conta", () => {
    const masked = maskSensitiveText("Agência: 1234 Conta: 56789-0");
    expect(masked).toContain("****");
  });

  it("sanitiza nome de arquivo com CPF", () => {
    expect(maskFileName("extrato-123.456.789-00.pdf")).toBe("extrato-anon.pdf");
  });
});
