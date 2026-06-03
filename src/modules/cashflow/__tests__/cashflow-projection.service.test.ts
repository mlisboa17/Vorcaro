import { describe, expect, it } from "vitest";
import { CashflowProjectionService } from "../application/services/cashflow-projection.service";

function daysFromNow(days: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days, 12));
}

describe("cashflow projection service", () => {
  it("calcula projeções e primeira data negativa com timeline cronológica", async () => {
    const service = new CashflowProjectionService({
      getActiveAccountsBalance: async () => ["1000.00"],
      getFutureTransactions: async () => [
        {
          id: "tx-1",
          type: "EXPENSE",
          amount: "200.00",
          description: "Conta de luz",
          date: daysFromNow(2),
          dataCaixa: null,
          dataVencimentoFatura: null,
          cardId: null,
          liabilityId: null,
        },
        {
          id: "tx-2",
          type: "INCOME",
          amount: "150.00",
          description: "Freela",
          date: daysFromNow(4),
          dataCaixa: null,
          dataVencimentoFatura: null,
          cardId: null,
          liabilityId: null,
        },
      ],
      getActiveRecurring: async () => [],
      getActiveLiabilities: async () => [],
      getActiveConsortiums: async () => [],
      getOpenReceivablesUntil: async () => [],
    });

    const result = await service.execute("user-1");
    expect(result.saldoAtual).toBe(1000);
    expect(result.previsao7Dias).toBe(950);
    expect(result.primeiraDataNegativa).toBeNull();
  });

  it("projeta recorrências e detecta data negativa", async () => {
    const service = new CashflowProjectionService({
      getActiveAccountsBalance: async () => ["300.00"],
      getFutureTransactions: async () => [],
      getActiveRecurring: async () => [
        {
          id: "rec-1",
          descricao: "Aluguel",
          tipo: "DESPESA",
          valor: "500.00",
          frequencia: "MENSAL",
          proximaExecucao: daysFromNow(1),
          dataFim: null,
          diaInicioOriginal: 2,
          liabilityId: null,
        },
      ],
      getActiveLiabilities: async () => [],
      getActiveConsortiums: async () => [],
      getOpenReceivablesUntil: async () => [],
    });

    const result = await service.execute("user-2");
    expect(result.previsao30Dias).toBeLessThan(0);
    expect(result.primeiraDataNegativa).toBeTruthy();
    expect(result.alertas.some((a) => a.tipo === "CAIXA_NEGATIVO")).toBe(true);
  });

  it("dispara alerta de concentração de despesas e excesso de compromissos", async () => {
    const service = new CashflowProjectionService({
      getActiveAccountsBalance: async () => ["10000.00"],
      getFutureTransactions: async () =>
        Array.from({ length: 25 }, (_, index) => ({
          id: `tx-${index}`,
          type: "EXPENSE" as const,
          amount: "100.00",
          description: `Despesa ${index}`,
          date: daysFromNow((index % 15) + 1),
          dataCaixa: null,
          dataVencimentoFatura: null,
          cardId: null,
          liabilityId: "liab-1",
        })),
      getActiveRecurring: async () => [],
      getActiveLiabilities: async () => [{ id: "liab-1", nome: "Financiamento", saldoAtual: "5000.00" }],
      getActiveConsortiums: async () => [],
      getOpenReceivablesUntil: async () => [],
    });

    const result = await service.execute("user-3");
    expect(result.alertas.some((a) => a.tipo === "CONCENTRACAO_DESPESAS")).toBe(true);
    expect(result.alertas.some((a) => a.tipo === "EXCESSO_COMPROMISSOS")).toBe(true);
  });

  it("injeta parcelas futuras de consórcio com origem CONSORCIO", async () => {
    const service = new CashflowProjectionService({
      getActiveAccountsBalance: async () => ["5000.00"],
      getFutureTransactions: async () => [],
      getActiveRecurring: async () => [],
      getActiveLiabilities: async () => [],
      getActiveConsortiums: async () => [
        {
          id: "cons-1",
          nome: "Consórcio Veículo",
          valorCredito: "60000.00",
          valorTaxas: "6000.00",
          quantidadeParcelas: 60,
          parcelasPagas: 10,
          dataContratacao: daysFromNow(-300),
          createdAt: daysFromNow(-300),
        },
      ],
      getOpenReceivablesUntil: async () => [],
    });

    const result = await service.execute("user-cons");
    const consortiumEvents = result.eventos.filter((event) => event.origem === "CONSORCIO");
    expect(consortiumEvents.length).toBeGreaterThan(0);
    expect(consortiumEvents.every((event) => event.valor < 0)).toBe(true);
  });
});
