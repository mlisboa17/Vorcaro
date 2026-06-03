import type { PrismaClient, Receivable, ReceivableStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import type { Prisma } from "@prisma/client";
import type {
  CreateReceivableInput,
  ReceivableRecord,
  ReceivableRepositoryPort,
  ReceivableSummary,
} from "../../domain/ports/receivable.port";
import { ReceivableService, decimalToNumber, isReceivableOpenStatus, toDecimal } from "../../domain/services/receivable.service";

function mapRecord(row: Receivable): ReceivableRecord {
  return {
    id: row.id,
    userId: row.userId,
    descricao: row.descricao,
    devedorNome: row.devedorNome,
    valorOriginal: decimalToNumber(row.valorOriginal),
    valorRecebido: decimalToNumber(row.valorRecebido),
    valorPendente: decimalToNumber(row.valorPendente),
    status: row.status,
    origem: row.origem,
    observacoes: row.observacoes,
    expectedDate: row.expectedDate,
    receivedAt: row.receivedAt,
    transactionId: row.transactionId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaReceivableRepository implements ReceivableRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateReceivableInput): Promise<ReceivableRecord> {
    const amounts = ReceivableService.buildNewReceivableAmounts(toDecimal(input.valorOriginal));
    const row = await this.prisma.receivable.create({
      data: {
        userId: input.userId,
        descricao: input.descricao.trim(),
        devedorNome: input.devedorNome.trim(),
        valorOriginal: amounts.valorOriginal,
        valorRecebido: amounts.valorRecebido,
        valorPendente: amounts.valorPendente,
        status: amounts.status,
        origem: input.origem ?? null,
        observacoes: input.observacoes ?? null,
        expectedDate: input.expectedDate ?? null,
        transactionId: input.transactionId ?? null,
      },
    });
    return mapRecord(row);
  }

  async findByIdForUser(id: string, userId: string): Promise<ReceivableRecord | null> {
    const row = await this.prisma.receivable.findFirst({ where: { id, userId } });
    return row ? mapRecord(row) : null;
  }

  async listByUserId(
    userId: string,
    options?: { status?: ReceivableStatus[]; includeCancelled?: boolean },
  ): Promise<ReceivableRecord[]> {
    const statusFilter = options?.status;
    const rows = await this.prisma.receivable.findMany({
      where: {
        userId,
        ...(statusFilter?.length ? { status: { in: statusFilter } } : {}),
        ...(!options?.includeCancelled && !statusFilter?.length
          ? { status: { not: "CANCELLED" } }
          : {}),
      },
      orderBy: [{ expectedDate: "asc" }, { createdAt: "desc" }],
    });
    return rows.map(mapRecord);
  }

  async update(
    id: string,
    userId: string,
    data: Partial<
      Pick<
        ReceivableRecord,
        "valorRecebido" | "valorPendente" | "status" | "receivedAt" | "observacoes" | "expectedDate"
      >
    >,
  ): Promise<ReceivableRecord | null> {
    const existing = await this.prisma.receivable.findFirst({ where: { id, userId } });
    if (!existing) return null;

    const row = await this.prisma.receivable.update({
      where: { id },
      data: {
        ...(data.valorRecebido != null ? { valorRecebido: new Decimal(data.valorRecebido) } : {}),
        ...(data.valorPendente != null ? { valorPendente: new Decimal(data.valorPendente) } : {}),
        ...(data.status != null ? { status: data.status } : {}),
        ...(data.receivedAt !== undefined ? { receivedAt: data.receivedAt } : {}),
        ...(data.observacoes !== undefined ? { observacoes: data.observacoes } : {}),
        ...(data.expectedDate !== undefined ? { expectedDate: data.expectedDate } : {}),
      },
    });
    return mapRecord(row);
  }

  async getSummary(userId: string): Promise<ReceivableSummary> {
    const rows = await this.prisma.receivable.findMany({
      where: { userId, status: { not: "CANCELLED" } },
      select: {
        devedorNome: true,
        valorOriginal: true,
        valorRecebido: true,
        valorPendente: true,
        status: true,
        expectedDate: true,
      },
    });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let totalOriginal = new Decimal(0);
    let totalRecebido = new Decimal(0);
    let totalPendente = new Decimal(0);
    let totalVencido = new Decimal(0);
    let countOpen = 0;
    let countPartial = 0;
    let countReceived = 0;
    let countCancelled = 0;

    const byDebtorMap = new Map<string, Decimal>();

    for (const row of rows) {
      totalOriginal = totalOriginal.plus(row.valorOriginal);
      totalRecebido = totalRecebido.plus(row.valorRecebido);
      if (isReceivableOpenStatus(row.status)) {
        totalPendente = totalPendente.plus(row.valorPendente);
        byDebtorMap.set(
          row.devedorNome,
          (byDebtorMap.get(row.devedorNome) ?? new Decimal(0)).plus(row.valorPendente),
        );
        if (row.expectedDate && row.expectedDate < today) {
          totalVencido = totalVencido.plus(row.valorPendente);
        }
      }

      if (row.status === "OPEN") countOpen += 1;
      if (row.status === "PARTIALLY_RECEIVED") countPartial += 1;
      if (row.status === "RECEIVED") countReceived += 1;
    }

    const cancelledCount = await this.prisma.receivable.count({
      where: { userId, status: "CANCELLED" },
    });
    countCancelled = cancelledCount;

    const byDebtor = [...byDebtorMap.entries()]
      .map(([devedorNome, valorPendente]) => ({
        devedorNome,
        valorPendente: decimalToNumber(valorPendente),
      }))
      .sort((a, b) => b.valorPendente - a.valorPendente);

    return {
      totalOriginal: decimalToNumber(totalOriginal),
      totalRecebido: decimalToNumber(totalRecebido),
      totalPendente: decimalToNumber(totalPendente),
      totalVencido: decimalToNumber(totalVencido),
      countOpen,
      countPartial,
      countReceived,
      countCancelled,
      byDebtor,
    };
  }

  async listOpenWithExpectedDateUntil(userId: string, until: Date): Promise<ReceivableRecord[]> {
    const rows = await this.prisma.receivable.findMany({
      where: {
        userId,
        status: { in: ["OPEN", "PARTIALLY_RECEIVED"] },
        expectedDate: { not: null, lte: until },
      },
      orderBy: { expectedDate: "asc" },
    });
    return rows.map(mapRecord);
  }
}
