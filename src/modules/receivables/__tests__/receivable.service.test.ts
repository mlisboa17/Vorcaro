import { Decimal } from "@prisma/client/runtime/library";
import { describe, expect, it } from "vitest";
import {
  ReceivableService,
  computeReceivableStatus,
  computeValorPendente,
  toDecimal,
} from "../domain/services/receivable.service";

describe("ReceivableService", () => {
  it("cria valores iniciais com status OPEN", () => {
    const amounts = ReceivableService.buildNewReceivableAmounts(toDecimal("500.00"));
    expect(amounts.valorPendente.toFixed(2)).toBe("500.00");
    expect(amounts.valorRecebido.toFixed(2)).toBe("0.00");
    expect(amounts.status).toBe("OPEN");
  });

  it("aplica recebimento parcial", () => {
    const applied = ReceivableService.applyCollection(toDecimal(500), toDecimal(0), toDecimal(200));
    expect(applied.status).toBe("PARTIALLY_RECEIVED");
    expect(applied.valorRecebido.toFixed(2)).toBe("200.00");
    expect(applied.valorPendente.toFixed(2)).toBe("300.00");
    expect(applied.receivedAt).toBeNull();
  });

  it("aplica recebimento total", () => {
    const applied = ReceivableService.applyCollection(toDecimal(500), toDecimal(200), toDecimal(300));
    expect(applied.status).toBe("RECEIVED");
    expect(applied.valorPendente.toFixed(2)).toBe("0.00");
    expect(applied.receivedAt).toBeInstanceOf(Date);
  });

  it("rejeita recebimento acima do original", () => {
    expect(() =>
      ReceivableService.applyCollection(toDecimal(500), toDecimal(400), toDecimal(200)),
    ).toThrow(/excede/);
  });

  it("cancelamento zera pendente", () => {
    const cancelled = ReceivableService.applyCancellation();
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.valorPendente.toFixed(2)).toBe("0.00");
  });
});

describe("computeReceivableStatus", () => {
  it("calcula status conforme saldo", () => {
    expect(computeReceivableStatus(new Decimal(100), new Decimal(0), false)).toBe("OPEN");
    expect(computeReceivableStatus(new Decimal(100), new Decimal(40), false)).toBe(
      "PARTIALLY_RECEIVED",
    );
    expect(computeReceivableStatus(new Decimal(100), new Decimal(100), false)).toBe("RECEIVED");
    expect(computeReceivableStatus(new Decimal(100), new Decimal(10), true)).toBe("CANCELLED");
  });

  it("calcula valor pendente", () => {
    expect(computeValorPendente(new Decimal(500), new Decimal(150)).toFixed(2)).toBe("350.00");
  });
});
