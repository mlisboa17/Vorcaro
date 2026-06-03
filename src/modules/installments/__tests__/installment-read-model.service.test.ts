import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import type {
  InstallmentReadModelRepositoryPort,
  InstallmentTransactionRecord,
} from "../domain/ports/installment-read-model.port";
import { InstallmentReadModelService } from "../application/services/installment-read-model.service";
function daysFromNow(days: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days, 12));
}

function daysAgo(days: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days, 12));
}

function tx(
  partial: Partial<InstallmentTransactionRecord> & Pick<InstallmentTransactionRecord, "id">,
): InstallmentTransactionRecord {
  return {
    description: "Compra teste",
    amount: new Prisma.Decimal("100.00"),
    type: "EXPENSE",
    date: new Date("2026-01-15T12:00:00Z"),
    dataCaixa: null,
    dataVencimentoFatura: null,
    installmentGroup: "grp-1",
    idGrupoParcelamento: "grp-1",
    numeroParcela: 1,
    currentInstallment: 1,
    totalParcelas: 3,
    totalInstallments: 3,
    installments: 3,
    category: { name: "Lazer" },
    card: { id: "card-1", name: "Nubank" },
    ...partial,
  };
}

class InMemoryInstallmentRepo implements InstallmentReadModelRepositoryPort {
  constructor(
    private readonly all: InstallmentTransactionRecord[],
    private readonly userId = "user-a",
    private readonly foreignGroupIds = new Set<string>(),
  ) {}

  async findInstallmentTransactions(userId: string): Promise<InstallmentTransactionRecord[]> {
    if (userId !== this.userId) return [];
    return this.all;
  }

  async findTransactionsByGroup(
    userId: string,
    groupId: string,
  ): Promise<InstallmentTransactionRecord[]> {
    if (userId !== this.userId) return [];
    return this.all.filter(
      (t) => t.installmentGroup === groupId || t.idGrupoParcelamento === groupId,
    );
  }

  async existsGroupForOtherUser(_groupId: string, _userId: string): Promise<boolean> {
    return this.foreignGroupIds.has(_groupId);
  }
}

describe("InstallmentReadModelService", () => {
  it("ignora transações sem marcador de parcela", async () => {
    const service = new InstallmentReadModelService(
      new InMemoryInstallmentRepo([
        tx({
          id: "1",
          installmentGroup: null,
          idGrupoParcelamento: null,
          description: "Supermercado",
          numeroParcela: null,
          currentInstallment: null,
          totalParcelas: null,
          totalInstallments: null,
          installments: 1,
        }),
      ]),
    );
    const groups = await service.listGroups("user-a");
    expect(groups).toHaveLength(0);
  });

  it("usa fallback regex para parcelamento não estruturado", async () => {
    const service = new InstallmentReadModelService(
      new InMemoryInstallmentRepo([
        tx({
          id: "1",
          installmentGroup: null,
          idGrupoParcelamento: null,
          description: "FortlevEnergia 02/12",
          numeroParcela: null,
          currentInstallment: null,
          totalParcelas: null,
          totalInstallments: null,
          installments: 1,
        }),
      ]),
    );

    const groups = await service.listGroups("user-a");
    expect(groups).toHaveLength(1);
    expect(groups[0]?.parcelamentoEstruturado).toBe(false);
    expect(groups[0]?.installmentGroup.startsWith("unstruct_")).toBe(true);
    expect(groups[0]?.totalParcelas).toBe(12);
  });

  it("agrupa por installmentGroup e calcula totais", async () => {
    const service = new InstallmentReadModelService(
      new InMemoryInstallmentRepo([
        tx({
          id: "1",
          installmentGroup: "grp-a",
          numeroParcela: 1,
          amount: new Prisma.Decimal("100.00"),
          date: daysAgo(120),
          dataCaixa: daysAgo(120),
        }),
        tx({
          id: "2",
          installmentGroup: "grp-a",
          numeroParcela: 2,
          amount: new Prisma.Decimal("100.00"),
          date: daysAgo(90),
          dataCaixa: daysFromNow(30),
        }),
        tx({
          id: "3",
          installmentGroup: "grp-a",
          numeroParcela: 3,
          amount: new Prisma.Decimal("100.00"),
          date: daysAgo(60),
          dataCaixa: daysFromNow(90),
        }),
      ]),
    );

    const groups = await service.listGroups("user-a");
    expect(groups).toHaveLength(1);
    const g = groups[0]!;
    expect(g.installmentGroup).toBe("grp-a");
    expect(g.valorTotal).toBe(300);
    expect(g.parcelasPagas).toBe(1);
    expect(g.parcelasRestantes).toBe(2);
    expect(g.valorPago).toBe(100);
    expect(g.valorRestante).toBe(200);
    expect(g.parcelaAtual).toBe(2);
    expect(g.status).toBe("ATIVO");
  });

  it("marca grupo como CONCLUIDO quando todas as parcelas estão pagas", async () => {
    const service = new InstallmentReadModelService(
      new InMemoryInstallmentRepo([
        tx({
          id: "1",
          installmentGroup: "done",
          numeroParcela: 1,
          totalParcelas: 2,
          totalInstallments: 2,
          installments: 2,
          dataCaixa: daysAgo(90),
        }),
        tx({
          id: "2",
          installmentGroup: "done",
          numeroParcela: 2,
          totalParcelas: 2,
          totalInstallments: 2,
          installments: 2,
          dataCaixa: daysAgo(60),
        }),
      ]),
    );

    const groups = await service.listGroups("user-a");
    expect(groups[0]?.status).toBe("CONCLUIDO");
    expect(groups[0]?.parcelasRestantes).toBe(0);
    expect(groups[0]?.parcelaAtual).toBeNull();
  });

  it("nunca retorna parcelasRestantes ou valorRestante negativos", async () => {
    const service = new InstallmentReadModelService(
      new InMemoryInstallmentRepo([
        tx({
          id: "1",
          installmentGroup: "over",
          numeroParcela: 1,
          totalParcelas: 2,
          dataCaixa: daysAgo(90),
        }),
        tx({
          id: "2",
          installmentGroup: "over",
          numeroParcela: 2,
          dataCaixa: daysAgo(60),
        }),
        tx({
          id: "3",
          installmentGroup: "over",
          numeroParcela: 3,
          totalParcelas: 2,
          dataCaixa: daysAgo(30),
        }),
      ]),
    );

    const g = (await service.listGroups("user-a"))[0]!;
    expect(g.parcelasRestantes).toBeGreaterThanOrEqual(0);
    expect(g.valorRestante).toBeGreaterThanOrEqual(0);
  });

  it("exclui pagamento de fatura da agregação", async () => {
    const service = new InstallmentReadModelService(
      new InMemoryInstallmentRepo([
        tx({
          id: "1",
          installmentGroup: "mix",
          numeroParcela: 1,
          description: "Compra loja",
          amount: new Prisma.Decimal("50.00"),
        }),
        tx({
          id: "2",
          installmentGroup: "mix",
          numeroParcela: 2,
          description: "Pagamento Fatura",
          amount: new Prisma.Decimal("500.00"),
        }),
      ]),
    );

    const g = (await service.listGroups("user-a"))[0]!;
    expect(g.valorTotal).toBe(50);
    expect(g.totalParcelas).toBeGreaterThanOrEqual(1);
  });

  it("getSummary agrega cards analíticos", async () => {
    const service = new InstallmentReadModelService(
      new InMemoryInstallmentRepo([
        tx({
          id: "1",
          installmentGroup: "g1",
          numeroParcela: 1,
          amount: new Prisma.Decimal("200.00"),
          dataCaixa: daysAgo(30),
        }),
        tx({
          id: "2",
          installmentGroup: "g1",
          numeroParcela: 2,
          amount: new Prisma.Decimal("200.00"),
          dataCaixa: daysFromNow(120),
        }),
      ]),
    );

    const summary = await service.getSummary("user-a");
    expect(summary.parceladoTotal).toBe(400);
    expect(summary.valorJaPago).toBe(200);
    expect(summary.valorRestante).toBe(200);
    expect(summary.planosAtivos).toBe(1);
  });

  it("getFutureCommitments lista apenas parcelas em aberto futuras", async () => {
    const service = new InstallmentReadModelService(
      new InMemoryInstallmentRepo([
        tx({
          id: "1",
          installmentGroup: "fut",
          numeroParcela: 1,
          dataCaixa: daysAgo(60),
        }),
        tx({
          id: "2",
          installmentGroup: "fut",
          numeroParcela: 2,
          dataCaixa: daysFromNow(180),
        }),
      ]),
    );

    const commitments = await service.getFutureCommitments("user-a");
    expect(commitments.some((c) => c.numeroParcela === 2)).toBe(true);
    expect(commitments.every((c) => c.installmentGroup === "fut")).toBe(true);
  });

  it("ownership: outro usuário não vê grupos", async () => {
    const service = new InstallmentReadModelService(
      new InMemoryInstallmentRepo([tx({ id: "1", installmentGroup: "secret" })], "user-a"),
    );
    expect(await service.listGroups("user-b")).toHaveLength(0);
    expect(await service.getGroupTransactions("user-b", "secret")).toBeNull();
  });

  it("isGroupForbiddenForUser detecta grupo de outro usuário", async () => {
    const foreign = new Set(["other-user-grp"]);
    const service = new InstallmentReadModelService(
      new InMemoryInstallmentRepo([], "user-a", foreign),
    );
    expect(await service.isGroupForbiddenForUser("user-a", "other-user-grp")).toBe(true);
    expect(await service.getGroupDetail("user-a", "other-user-grp")).toBeNull();
  });

  it("getGroupDetail inclui status PAID/OPEN/OVERDUE por parcela", async () => {
    const service = new InstallmentReadModelService(
      new InMemoryInstallmentRepo([
        tx({
          id: "1",
          installmentGroup: "st",
          numeroParcela: 1,
          dataCaixa: daysAgo(30),
        }),
        tx({
          id: "2",
          installmentGroup: "st",
          numeroParcela: 2,
          dataCaixa: daysFromNow(30),
        }),
      ]),
    );
    const detail = await service.getGroupDetail("user-a", "st");
    expect(detail?.transactions).toHaveLength(2);
    expect(detail?.transactions[0]?.status).toBe("PAID");
    expect(detail?.transactions[1]?.status).toBe("OPEN");
  });

  it("getGroupTransactions retorna null para grupo inexistente", async () => {
    const service = new InstallmentReadModelService(new InMemoryInstallmentRepo([]));
    expect(await service.getGroupTransactions("user-a", "missing")).toBeNull();
  });

  it("lista vazia quando não há grupos", async () => {
    const service = new InstallmentReadModelService(new InMemoryInstallmentRepo([]));
    expect(await service.listGroups("user-a")).toEqual([]);
  });

  it("usa dataVencimentoFatura quando dataCaixa ausente para pagamento", async () => {
    const service = new InstallmentReadModelService(
      new InMemoryInstallmentRepo([
        tx({
          id: "1",
          installmentGroup: "due",
          numeroParcela: 1,
          dataCaixa: null,
          dataVencimentoFatura: daysAgo(45),
          date: daysAgo(60),
        }),
      ]),
    );
    const g = (await service.listGroups("user-a"))[0]!;
    expect(g.parcelasPagas).toBe(1);
  });
});
