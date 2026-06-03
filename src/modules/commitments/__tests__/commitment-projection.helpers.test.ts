import { describe, expect, it } from "vitest";
import {
  computeLiabilityMonthlyPayment,
  deduplicateCommitments,
  projectRecurringOccurrencesInMonth,
} from "../domain/services/commitment-projection.helpers";
import { Decimal } from "@prisma/client/runtime/library";

describe("projectRecurringOccurrencesInMonth", () => {
  const monthStart = new Date(Date.UTC(2026, 5, 1));
  const monthEnd = new Date(Date.UTC(2026, 6, 1));

  it("projeta recorrência semanal com múltiplas ocorrências", () => {
    const occ = projectRecurringOccurrencesInMonth(
      {
        id: "r1",
        descricao: "Assinatura",
        tipo: "DESPESA",
        valor: new Decimal(50),
        frequencia: "SEMANAL",
        proximaExecucao: new Date("2026-06-01T12:00:00.000Z"),
        dataFim: null,
        diaInicioOriginal: 1,
        liabilityId: null,
      },
      monthStart,
      monthEnd,
    );
    expect(occ.length).toBeGreaterThanOrEqual(4);
  });

  it("projeta recorrência mensal única", () => {
    const occ = projectRecurringOccurrencesInMonth(
      {
        id: "r2",
        descricao: "Aluguel",
        tipo: "DESPESA",
        valor: new Decimal(1200),
        frequencia: "MENSAL",
        proximaExecucao: new Date("2026-06-05T12:00:00.000Z"),
        dataFim: null,
        diaInicioOriginal: 5,
        liabilityId: null,
      },
      monthStart,
      monthEnd,
    );
    expect(occ).toHaveLength(1);
    expect(occ[0]?.valor).toBe(1200);
  });
});

describe("computeLiabilityMonthlyPayment", () => {
  it("estima parcela mensal a partir do saldo e data de quitação", () => {
    const result = computeLiabilityMonthlyPayment({
      saldoAtual: new Decimal(12000),
      dataQuitacaoPrevista: new Date("2027-06-01T12:00:00.000Z"),
      dataContratacao: null,
    });
    expect(result).not.toBeNull();
    expect(result!.valor).toBeGreaterThan(0);
    expect(result!.valor).toBeLessThan(12000);
  });
});

describe("deduplicateCommitments", () => {
  it("remove duplicatas por descrição, data e valor", () => {
    const items = [
      {
        id: "1",
        origem: "RECURRENCE" as const,
        descricao: "Consórcio Moto",
        tipo: "OUTFLOW" as const,
        valor: 1000,
        dataPrevista: "2026-06-15",
        status: "PENDING" as const,
      },
      {
        id: "2",
        origem: "CONSORTIUM" as const,
        descricao: "Consórcio Moto",
        tipo: "OUTFLOW" as const,
        valor: 1000,
        dataPrevista: "2026-06-15",
        status: "PENDING" as const,
      },
    ];
    expect(deduplicateCommitments(items)).toHaveLength(1);
  });
});
