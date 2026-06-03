import type { ReceivableStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export function toDecimal(value: string | number | Decimal): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

export function computeValorPendente(valorOriginal: Decimal, valorRecebido: Decimal): Decimal {
  const pending = valorOriginal.minus(valorRecebido);
  return pending.lt(0) ? new Decimal(0) : pending;
}

export function computeReceivableStatus(
  valorOriginal: Decimal,
  valorRecebido: Decimal,
  cancelled: boolean,
): ReceivableStatus {
  if (cancelled) return "CANCELLED";
  if (valorRecebido.lte(0)) return "OPEN";
  if (valorRecebido.lt(valorOriginal)) return "PARTIALLY_RECEIVED";
  return "RECEIVED";
}

export function assertPositiveAmount(value: Decimal, label = "Valor"): void {
  if (value.lte(0)) {
    throw new Error(`${label} deve ser positivo.`);
  }
}

export class ReceivableService {
  static buildNewReceivableAmounts(valorOriginal: Decimal) {
    assertPositiveAmount(valorOriginal, "Valor original");
    return {
      valorOriginal,
      valorRecebido: new Decimal(0),
      valorPendente: valorOriginal,
      status: "OPEN" as ReceivableStatus,
    };
  }

  static applyCollection(
    valorOriginal: Decimal,
    valorRecebidoAtual: Decimal,
    amount: Decimal,
  ): {
    valorRecebido: Decimal;
    valorPendente: Decimal;
    status: ReceivableStatus;
    receivedAt: Date | null;
  } {
    assertPositiveAmount(amount, "Valor do recebimento");
    const valorRecebido = valorRecebidoAtual.plus(amount);
    if (valorRecebido.gt(valorOriginal)) {
      throw new Error("Valor recebido excede o valor original da conta.");
    }

    const valorPendente = computeValorPendente(valorOriginal, valorRecebido);
    const status = computeReceivableStatus(valorOriginal, valorRecebido, false);

    return {
      valorRecebido,
      valorPendente,
      status,
      receivedAt: status === "RECEIVED" ? new Date() : null,
    };
  }

  static applyCancellation() {
    return {
      valorPendente: new Decimal(0),
      status: "CANCELLED" as ReceivableStatus,
    };
  }
}

export function decimalToNumber(value: Decimal): number {
  return value.toNumber();
}

export function isReceivableOpenStatus(status: ReceivableStatus): boolean {
  return status === "OPEN" || status === "PARTIALLY_RECEIVED";
}
