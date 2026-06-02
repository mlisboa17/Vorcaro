import { describe, expect, it } from "vitest";
import { buildConsortiumAlerts, computeParcelValue } from "../consortium-domain";

describe("consortium domain alerts", () => {
  it("gera alerta crítico para contemplado sem bem", () => {
    const alerts = buildConsortiumAlerts([
      {
        id: "1",
        nome: "Imóvel",
        status: "CONTEMPLATED",
        assetId: null,
        valorCredito: { toNumber: () => 200_000 } as never,
        valorPago: { toNumber: () => 50_000 } as never,
        estaAtivo: true,
      },
    ]);

    expect(alerts.some((alert) => alert.type === "CONSORCIO_SEM_BEM")).toBe(true);
  });

  it("calcula valor da parcela com crédito e taxas", () => {
    const parcela = computeParcelValue({
      valorCredito: { toNumber: () => 60_000 },
      valorTaxas: { toNumber: () => 6_000 },
      quantidadeParcelas: 60,
    });

    expect(parcela).toBe(1100);
  });
});
