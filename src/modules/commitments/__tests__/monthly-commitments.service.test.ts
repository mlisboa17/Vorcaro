import { describe, expect, it, vi, beforeEach } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { MonthlyCommitmentsService } from "../application/services/monthly-commitments.service";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/api/installments", () => ({
  buildInstallmentReadModelService: () => ({
    getFutureCommitments: vi.fn().mockResolvedValue([
      {
        transactionId: "tx1",
        descricao: "Notebook 10x",
        valor: 250,
        data: "2026-06-15",
        cartao: "Nubank",
      },
    ]),
  }),
}));

function baseRecurring(overrides: Record<string, unknown> = {}) {
  return {
    id: "r1",
    descricao: "Aluguel",
    tipo: "DESPESA" as const,
    valor: new Decimal(1200),
    frequencia: "MENSAL" as const,
    proximaExecucao: new Date("2026-06-05T12:00:00.000Z"),
    dataFim: null,
    diaInicioOriginal: 5,
    liabilityId: null,
    category: null,
    financialAccount: null,
    card: null,
    ...overrides,
  };
}

function makePrismaMock(overrides: Partial<Record<string, unknown[]>> = {}): PrismaClient {
  return {
    lancamentoRecorrente: {
      findMany: vi.fn().mockResolvedValue(overrides.recs ?? []),
    },
    receivable: {
      findMany: vi.fn().mockResolvedValue(overrides.recvs ?? []),
    },
    patrimonyLiability: {
      findMany: vi.fn().mockResolvedValue(overrides.liabs ?? []),
    },
    consortium: {
      findMany: vi.fn().mockResolvedValue(overrides.consorcios ?? []),
    },
    transaction: {
      findMany: vi
        .fn()
        .mockResolvedValueOnce(overrides.cardTxs ?? [])
        .mockResolvedValueOnce(overrides.scheduledTxs ?? []),
    },
  } as unknown as PrismaClient;
}

describe("MonthlyCommitmentsService", () => {
  const userId = "user-1";
  const month = "2026-06";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("agrega recorrências do mês como OUTFLOW", async () => {
    const prisma = makePrismaMock({ recs: [baseRecurring()] });
    const res = await new MonthlyCommitmentsService(prisma).execute(userId, month);
    const rec = res.items.find((i) => i.origem === "RECURRENCE");
    expect(rec?.tipo).toBe("OUTFLOW");
    expect(rec?.valor).toBe(1200);
  });

  it("agrega contas a receber como INFLOW", async () => {
    const prisma = makePrismaMock({
      recvs: [
        {
          id: "rv1",
          descricao: "Reembolso",
          devedorNome: "Empresa",
          valorPendente: new Decimal(450),
          expectedDate: new Date("2026-06-20T12:00:00.000Z"),
        },
      ],
    });
    const res = await new MonthlyCommitmentsService(prisma).execute(userId, month);
    expect(res.items.some((i) => i.origem === "RECEIVABLE" && i.tipo === "INFLOW")).toBe(true);
  });

  it("agrega parcelamentos via read model", async () => {
    const res = await new MonthlyCommitmentsService(makePrismaMock()).execute(userId, month);
    expect(res.items.some((i) => i.origem === "INSTALLMENT")).toBe(true);
  });

  it("agrega passivos com parcela mensal estimada", async () => {
    const prisma = makePrismaMock({
      liabs: [
        {
          id: "l1",
          nome: "Financiamento Carro",
          saldoAtual: new Decimal(12000),
          dataQuitacaoPrevista: new Date("2027-06-01T12:00:00.000Z"),
          dataContratacao: null,
        },
      ],
    });
    const res = await new MonthlyCommitmentsService(prisma).execute(userId, month);
    const liab = res.items.find((i) => i.origem === "LIABILITY");
    expect(liab).toBeTruthy();
    expect(liab!.valor).toBeLessThan(12000);
    expect(liab!.valor).toBeGreaterThan(0);
  });

  it("agrega faturas de cartão (CREDIT_CARD)", async () => {
    const prisma = makePrismaMock({
      cardTxs: [
        {
          id: "c1",
          type: "EXPENSE",
          amount: new Decimal(300),
          description: "Compra",
          dataVencimentoFatura: new Date("2026-06-10T12:00:00.000Z"),
          cardId: "card1",
          card: { name: "Nubank" },
        },
        {
          id: "c2",
          type: "EXPENSE",
          amount: new Decimal(200),
          description: "Compra 2",
          dataVencimentoFatura: new Date("2026-06-10T12:00:00.000Z"),
          cardId: "card1",
          card: { name: "Nubank" },
        },
      ],
    });
    const res = await new MonthlyCommitmentsService(prisma).execute(userId, month);
    const card = res.items.find((i) => i.origem === "CREDIT_CARD");
    expect(card?.valor).toBe(500);
  });

  it("agrega transações futuras agendadas", async () => {
    const prisma = makePrismaMock({
      scheduledTxs: [
        {
          id: "tx-future",
          type: "EXPENSE",
          amount: new Decimal(150),
          description: "Pagamento agendado",
          date: new Date("2026-06-18T12:00:00.000Z"),
          dataCaixa: null,
          dataVencimentoFatura: null,
          cardId: null,
          liabilityId: null,
          installmentGroup: null,
          category: { name: "Serviços" },
          account: { name: "Conta" },
          card: null,
        },
      ],
    });
    const res = await new MonthlyCommitmentsService(prisma).execute(userId, month);
    expect(res.items.some((i) => i.id === "tx-tx-future")).toBe(true);
  });

  it("calcula agregação por origem", async () => {
    const prisma = makePrismaMock({
      recs: [baseRecurring({ descricao: "Internet", valor: new Decimal(100) })],
      recvs: [
        {
          id: "rv1",
          descricao: "Reemb",
          devedorNome: "X",
          valorPendente: new Decimal(200),
          expectedDate: new Date("2026-06-10T12:00:00.000Z"),
        },
      ],
    });
    const res = await new MonthlyCommitmentsService(prisma).execute(userId, month);
    expect(res.byOrigin.some((o) => o.origin === "RECURRENCE")).toBe(true);
    expect(res.byOrigin.some((o) => o.origin === "RECEIVABLE")).toBe(true);
  });

  it("detecta vencidos no mês corrente", async () => {
    const prisma = makePrismaMock({
      recs: [
        baseRecurring({
          id: "r-old",
          descricao: "Seguro",
          valor: new Decimal(300),
          proximaExecucao: new Date("2026-06-01T12:00:00.000Z"),
        }),
      ],
    });
    const res = await new MonthlyCommitmentsService(prisma).execute(userId, month);
    expect(res.overdueCount).toBeGreaterThan(0);
  });

  it("expõe próximos 7 dias", async () => {
    const soon = new Date();
    soon.setUTCDate(soon.getUTCDate() + 2);
    const monthStr = `${soon.getUTCFullYear()}-${String(soon.getUTCMonth() + 1).padStart(2, "0")}`;
    const prisma = makePrismaMock({
      recs: [
        baseRecurring({
          proximaExecucao: soon,
          valor: new Decimal(50),
          descricao: "Assinatura",
        }),
      ],
    });
    const res = await new MonthlyCommitmentsService(prisma).execute(userId, monthStr);
    expect(res.next7DaysCount).toBeGreaterThanOrEqual(1);
  });

  it("aplica deduplicação mínima", async () => {
    const prisma = makePrismaMock({
      recs: [
        baseRecurring({
          descricao: "Consórcio Moto",
          valor: new Decimal(1000),
          proximaExecucao: new Date("2026-06-15T12:00:00.000Z"),
        }),
      ],
      consorcios: [
        {
          id: "c1",
          nome: "Consórcio Moto",
          valorCredito: new Decimal(12000),
          valorTaxas: new Decimal(0),
          quantidadeParcelas: 12,
          parcelasPagas: 0,
          dataContratacao: new Date("2026-01-15T12:00:00.000Z"),
          createdAt: new Date("2026-01-01T12:00:00.000Z"),
        },
      ],
    });
    const res = await new MonthlyCommitmentsService(prisma).execute(userId, month);
    const motoItems = res.items.filter((i) => i.descricao.toLowerCase().includes("consórcio moto"));
    expect(motoItems.length).toBe(1);
  });

  it("filtra por userId (ownership)", async () => {
    const prisma = makePrismaMock({ recs: [baseRecurring()] });
    await new MonthlyCommitmentsService(prisma).execute("user-other", month);
    expect(prisma.lancamentoRecorrente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-other" }) }),
    );
  });
});
