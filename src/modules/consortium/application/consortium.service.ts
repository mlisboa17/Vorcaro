import type { ConsortiumStatus, Prisma, PrismaClient } from "@prisma/client";
import type { CreateConsortiumInput, UpdateConsortiumInput } from "@/lib/consortium/consortium-schemas";
import {
  computeParcelValue,
  decimalToNumber,
  requiresAssetForStatus,
} from "@/lib/consortium/consortium-domain";

export class ConsortiumError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ConsortiumError";
  }
}

function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T12:00:00.000Z`);
}

export class ConsortiumService {
  constructor(private readonly prisma: PrismaClient) {}

  list(userId: string, options?: { includeInactive?: boolean }) {
    return this.prisma.consortium.findMany({
      where: {
        userId,
        ...(options?.includeInactive ? {} : { estaAtivo: true }),
      },
      include: { asset: true },
      orderBy: [{ estaAtivo: "desc" }, { nome: "asc" }],
    });
  }

  async getById(id: string, userId: string) {
    const record = await this.prisma.consortium.findFirst({
      where: { id, userId },
      include: { asset: true },
    });

    if (!record) {
      throw new ConsortiumError("Consórcio não encontrado.", 404);
    }

    return record;
  }

  async create(userId: string, input: CreateConsortiumInput) {
    const status = input.status ?? "NOT_CONTEMPLATED";
    await this.validateAsset(userId, input.assetId ?? null, status);

    if (input.lancamentoRecorrenteId) {
      await this.validateRecurring(userId, input.lancamentoRecorrenteId);
    }

    return this.prisma.consortium.create({
      data: {
        userId,
        nome: input.nome,
        tipo: input.tipo,
        status,
        valorCredito: input.valorCredito,
        valorLance: input.valorLance ?? 0,
        valorPago: input.valorPago ?? 0,
        valorTaxas: input.valorTaxas ?? 0,
        quantidadeParcelas: input.quantidadeParcelas,
        parcelasPagas: input.parcelasPagas ?? 0,
        dataContratacao: parseOptionalDate(input.dataContratacao) ?? undefined,
        dataContemplacao: parseOptionalDate(input.dataContemplacao) ?? undefined,
        dataQuitacao: parseOptionalDate(input.dataQuitacao) ?? undefined,
        assetId: input.assetId ?? undefined,
        lancamentoRecorrenteId: input.lancamentoRecorrenteId ?? undefined,
      },
      include: { asset: true },
    });
  }

  async update(id: string, userId: string, input: UpdateConsortiumInput) {
    const existing = await this.getById(id, userId);
    const nextStatus = input.status ?? existing.status;

    if (input.registrarPagamentoParcela) {
      return this.registerParcelPayment(existing.id, userId);
    }

    if (requiresAssetForStatus(nextStatus)) {
      const assetId = input.assetId === undefined ? existing.assetId : input.assetId;
      if (!assetId) {
        throw new ConsortiumError(
          "Informe um ativo patrimonial para status Bem adquirido (ASSET_ACQUIRED).",
        );
      }
      await this.validateAsset(userId, assetId, nextStatus, existing.id);
    }

    if (input.assetId) {
      await this.validateAsset(userId, input.assetId, nextStatus, existing.id);
    }

    if (input.lancamentoRecorrenteId) {
      await this.validateRecurring(userId, input.lancamentoRecorrenteId);
    }

    const data: Prisma.ConsortiumUpdateInput = {
      ...(input.nome !== undefined ? { nome: input.nome } : {}),
      ...(input.tipo !== undefined ? { tipo: input.tipo } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.valorCredito !== undefined ? { valorCredito: input.valorCredito } : {}),
      ...(input.valorLance !== undefined ? { valorLance: input.valorLance } : {}),
      ...(input.valorPago !== undefined ? { valorPago: input.valorPago } : {}),
      ...(input.valorTaxas !== undefined ? { valorTaxas: input.valorTaxas } : {}),
      ...(input.quantidadeParcelas !== undefined
        ? { quantidadeParcelas: input.quantidadeParcelas }
        : {}),
      ...(input.parcelasPagas !== undefined ? { parcelasPagas: input.parcelasPagas } : {}),
      ...(input.dataContratacao !== undefined
        ? { dataContratacao: parseOptionalDate(input.dataContratacao) }
        : {}),
      ...(input.dataContemplacao !== undefined
        ? { dataContemplacao: parseOptionalDate(input.dataContemplacao) }
        : {}),
      ...(input.dataQuitacao !== undefined
        ? { dataQuitacao: parseOptionalDate(input.dataQuitacao) }
        : {}),
      ...(input.assetId !== undefined ? { assetId: input.assetId } : {}),
      ...(input.lancamentoRecorrenteId !== undefined
        ? { lancamentoRecorrenteId: input.lancamentoRecorrenteId }
        : {}),
    };

    return this.prisma.consortium.update({
      where: { id: existing.id },
      data,
      include: { asset: true },
    });
  }

  async softDelete(id: string, userId: string) {
    await this.getById(id, userId);

    return this.prisma.consortium.update({
      where: { id },
      data: {
        estaAtivo: false,
        assetId: null,
      },
      include: { asset: true },
    });
  }

  async registerParcelPayment(id: string, userId: string) {
    const existing = await this.getById(id, userId);

    if (!existing.estaAtivo || existing.status === "COMPLETED") {
      throw new ConsortiumError("Consórcio inativo ou já quitado.");
    }

    if (existing.parcelasPagas >= existing.quantidadeParcelas) {
      throw new ConsortiumError("Todas as parcelas já foram registradas.");
    }

    const parcelValue = computeParcelValue(existing);
    const nextParcelas = existing.parcelasPagas + 1;
    const nextValorPago = decimalToNumber(existing.valorPago) + parcelValue;
    const nextStatus: ConsortiumStatus =
      nextParcelas >= existing.quantidadeParcelas ? "COMPLETED" : existing.status;

    return this.prisma.consortium.update({
      where: { id: existing.id },
      data: {
        parcelasPagas: nextParcelas,
        valorPago: nextValorPago,
        status: nextStatus,
        ...(nextStatus === "COMPLETED"
          ? { dataQuitacao: existing.dataQuitacao ?? new Date() }
          : {}),
      },
      include: { asset: true },
    });
  }

  async getExecutiveSummary(userId: string) {
    const active = await this.prisma.consortium.findMany({
      where: { userId, estaAtivo: true, status: { not: "COMPLETED" } },
      select: { valorCredito: true, valorPago: true },
    });

    return {
      consorciosAtivos: active.length,
      creditoTotalConsorcio: active.reduce(
        (sum, item) => sum + decimalToNumber(item.valorCredito),
        0,
      ),
      valorPagoConsorcio: active.reduce((sum, item) => sum + decimalToNumber(item.valorPago), 0),
    };
  }

  private async validateAsset(
    userId: string,
    assetId: string | null,
    status: ConsortiumStatus,
    consortiumId?: string,
  ) {
    if (!assetId) {
      if (requiresAssetForStatus(status)) {
        throw new ConsortiumError("assetId é obrigatório para status ASSET_ACQUIRED.");
      }
      return;
    }

    const asset = await this.prisma.patrimonyAsset.findFirst({
      where: { id: assetId, userId, estaAtivo: true },
      select: { id: true },
    });

    if (!asset) {
      throw new ConsortiumError("Ativo patrimonial não encontrado ou inativo.", 403);
    }

    const linked = await this.prisma.consortium.findFirst({
      where: {
        assetId,
        ...(consortiumId ? { NOT: { id: consortiumId } } : {}),
        estaAtivo: true,
      },
      select: { id: true },
    });

    if (linked) {
      throw new ConsortiumError("Este ativo já está vinculado a outro consórcio ativo.");
    }
  }

  private async validateRecurring(userId: string, recurringId: string) {
    const recurring = await this.prisma.lancamentoRecorrente.findFirst({
      where: { id: recurringId, userId, estaAtivo: true },
      select: { id: true },
    });

    if (!recurring) {
      throw new ConsortiumError("Lançamento recorrente não encontrado.", 403);
    }
  }
}
