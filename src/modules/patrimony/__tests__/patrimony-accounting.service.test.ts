import { describe, expect, it } from "vitest";
import {
  calculateConsortiumParcelImpact,
  calculateFinancingPaymentImpact,
  calculateInvestmentImpact,
} from "../domain/services/patrimony-accounting.service";

describe("calculateInvestmentImpact", () => {
  it("aporte reduz caixa e aumenta patrimônio sem DRE", () => {
    const impact = calculateInvestmentImpact("APORTE", 1000);
    expect(impact).toEqual({
      caixa: -1000,
      dre: 0,
      patrimonioBruto: 1000,
      passivo: 0,
      patrimonioLiquido: 1000,
    });
  });

  it("resgate aumenta caixa e reduz patrimônio sem DRE", () => {
    const impact = calculateInvestmentImpact("RESGATE", 1000);
    expect(impact.caixa).toBe(1000);
    expect(impact.dre).toBe(0);
    expect(impact.patrimonioBruto).toBe(-1000);
  });

  it("rendimento impacta patrimônio e DRE positivamente", () => {
    const impact = calculateInvestmentImpact("RENDIMENTO", 150);
    expect(impact).toEqual({
      caixa: 0,
      dre: 150,
      patrimonioBruto: 150,
      passivo: 0,
      patrimonioLiquido: 150,
    });
  });
});

describe("calculateFinancingPaymentImpact", () => {
  it("decompõe parcela: caixa total, passivo amortização, DRE juros+seguro+taxa", () => {
    const impact = calculateFinancingPaymentImpact({
      amortizacao: 1300,
      juros: 500,
      seguro: 150,
      taxa: 50,
    });

    expect(impact.caixa).toBe(-2000);
    expect(impact.passivo).toBe(-1300);
    expect(impact.dre).toBe(-700);
    expect(impact.patrimonioBruto).toBe(0);
  });
});

describe("calculateConsortiumParcelImpact", () => {
  it("fundo comum aumenta ativo; taxas vão para DRE", () => {
    const impact = calculateConsortiumParcelImpact({
      fundoComum: 800,
      taxaAdministracao: 120,
      fundoReserva: 30,
    });

    expect(impact.caixa).toBe(-950);
    expect(impact.patrimonioBruto).toBe(800);
    expect(impact.dre).toBe(-150);
  });
});
