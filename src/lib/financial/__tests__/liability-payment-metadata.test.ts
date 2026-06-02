import { describe, expect, it } from "vitest";
import {
  buildLiabilityPaymentMetadata,
  computeNextLiabilityBalance,
  computeRestoredLiabilityBalance,
  FinancialImpactType,
  getAmortizacaoAplicadaFromMetadata,
  sumAmortizacaoFromMetadata,
} from "../liability-payment-metadata";

describe("liability-payment-metadata", () => {
  it("soma apenas AMORTIZACAO", () => {
    const metadata = buildLiabilityPaymentMetadata([
      { tipo: "AMORTIZACAO", valor: 1300 },
      { tipo: "JUROS", valor: 500 },
      { tipo: "SEGURO", valor: 80 },
      { tipo: "TAXA", valor: 20 },
    ]);

    expect(sumAmortizacaoFromMetadata(metadata)).toBe(1300);
  });

  it("não reduz saldo sem financialImpactType LIABILITY_PAYMENT", () => {
    expect(
      sumAmortizacaoFromMetadata({
        allocations: [{ tipo: "AMORTIZACAO", valor: 1000 }],
      }),
    ).toBe(0);
  });

  it("calcula saldo após amortização sem negativo", () => {
    expect(computeNextLiabilityBalance(82000, 1300)).toBe(80700);
    expect(computeNextLiabilityBalance(500, 800)).toBe(0);
  });

  it("usa amortizacaoAplicada gravada para reversão", () => {
    const metadata = {
      financialImpactType: FinancialImpactType.LIABILITY_PAYMENT,
      allocations: [{ tipo: "AMORTIZACAO" as const, valor: 9999 }],
      amortizacaoAplicada: 1300,
    };

    expect(getAmortizacaoAplicadaFromMetadata(metadata)).toBe(1300);
    expect(computeRestoredLiabilityBalance(80_700, 1300)).toBe(82_000);
  });

  it("monta metadata de pagamento de passivo", () => {
    expect(buildLiabilityPaymentMetadata()).toEqual({
      financialImpactType: FinancialImpactType.LIABILITY_PAYMENT,
    });
  });
});
