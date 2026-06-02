import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CreatePatrimonyAssetInput,
  CreatePatrimonyLiabilityInput,
  PatrimonyAssetRecord,
  PatrimonyAssetRepositoryPort,
  PatrimonyLiabilityRecord,
  PatrimonyLiabilityRepositoryPort,
  PatrimonyTransactionRecord,
  PatrimonyTransactionRepositoryPort,
  RegisterPatrimonyTransactionInput,
  UpdatePatrimonyAssetInput,
  UpdatePatrimonyLiabilityInput,
} from "../../domain/ports/patrimony.port";

type PrismaDb = PrismaClient | Prisma.TransactionClient;

function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

function toAsset(record: {
  id: string;
  userId: string;
  nome: string;
  descricao: string | null;
  tipo: PatrimonyAssetRecord["tipo"];
  valorAquisicao: Prisma.Decimal;
  valorAtual: Prisma.Decimal;
  dataAquisicao: Date | null;
  estaAtivo: boolean;
  observacoes: string | null;
  linkedLiabilityId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PatrimonyAssetRecord {
  return {
    ...record,
    valorAquisicao: decimalToNumber(record.valorAquisicao),
    valorAtual: decimalToNumber(record.valorAtual),
  };
}

function toLiability(record: {
  id: string;
  userId: string;
  nome: string;
  descricao: string | null;
  tipo: PatrimonyLiabilityRecord["tipo"];
  saldoOriginal: Prisma.Decimal;
  saldoAtual: Prisma.Decimal;
  taxaJuros: Prisma.Decimal | null;
  dataContratacao: Date | null;
  dataQuitacaoPrevista: Date | null;
  estaAtivo: boolean;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PatrimonyLiabilityRecord {
  return {
    ...record,
    saldoOriginal: decimalToNumber(record.saldoOriginal),
    saldoAtual: decimalToNumber(record.saldoAtual),
    taxaJuros: record.taxaJuros !== null ? decimalToNumber(record.taxaJuros) : null,
  };
}

function toTransaction(record: {
  id: string;
  userId: string;
  assetId: string | null;
  liabilityId: string | null;
  tipo: PatrimonyTransactionRecord["tipo"];
  valorTotal: Prisma.Decimal;
  data: Date;
  descricao: string | null;
  mainTransactionId: string | null;
  createdAt: Date;
}): PatrimonyTransactionRecord {
  return {
    ...record,
    valorTotal: decimalToNumber(record.valorTotal),
  };
}

export class PrismaPatrimonyAssetRepository implements PatrimonyAssetRepositoryPort {
  constructor(private readonly db: PrismaDb) {}

  async listByUserId(userId: string, options?: { includeInactive?: boolean }): Promise<PatrimonyAssetRecord[]> {
    const records = await this.db.patrimonyAsset.findMany({
      where: {
        userId,
        ...(options?.includeInactive ? {} : { estaAtivo: true }),
      },
      orderBy: { nome: "asc" },
    });
    return records.map(toAsset);
  }

  async findByIdForUser(id: string, userId: string): Promise<PatrimonyAssetRecord | null> {
    const record = await this.db.patrimonyAsset.findFirst({ where: { id, userId } });
    return record ? toAsset(record) : null;
  }

  async create(input: CreatePatrimonyAssetInput): Promise<PatrimonyAssetRecord> {
    const record = await this.db.patrimonyAsset.create({
      data: {
        userId: input.userId,
        nome: input.nome,
        descricao: input.descricao,
        tipo: input.tipo,
        valorAquisicao: input.valorAquisicao,
        valorAtual: input.valorAtual ?? input.valorAquisicao,
        dataAquisicao: input.dataAquisicao ?? null,
        observacoes: input.observacoes,
        linkedLiabilityId: input.linkedLiabilityId,
      },
    });
    return toAsset(record);
  }

  async update(id: string, userId: string, input: UpdatePatrimonyAssetInput): Promise<PatrimonyAssetRecord | null> {
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) return null;

    const record = await this.db.patrimonyAsset.update({
      where: { id },
      data: {
        ...(input.nome !== undefined ? { nome: input.nome } : {}),
        ...(input.descricao !== undefined ? { descricao: input.descricao } : {}),
        ...(input.tipo !== undefined ? { tipo: input.tipo } : {}),
        ...(input.valorAquisicao !== undefined ? { valorAquisicao: input.valorAquisicao } : {}),
        ...(input.valorAtual !== undefined ? { valorAtual: input.valorAtual } : {}),
        ...(input.dataAquisicao !== undefined ? { dataAquisicao: input.dataAquisicao } : {}),
        ...(input.estaAtivo !== undefined ? { estaAtivo: input.estaAtivo } : {}),
        ...(input.observacoes !== undefined ? { observacoes: input.observacoes } : {}),
        ...(input.linkedLiabilityId !== undefined
          ? { linkedLiabilityId: input.linkedLiabilityId }
          : {}),
      },
    });
    return toAsset(record);
  }

  async deleteById(id: string, userId: string): Promise<boolean> {
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) return false;
    await this.db.patrimonyAsset.delete({ where: { id } });
    return true;
  }

  async countUsage(id: string): Promise<number> {
    return this.db.patrimonyTransaction.count({ where: { assetId: id } });
  }
}

export class PrismaPatrimonyLiabilityRepository implements PatrimonyLiabilityRepositoryPort {
  constructor(private readonly db: PrismaDb) {}

  async listByUserId(userId: string, options?: { includeInactive?: boolean }): Promise<PatrimonyLiabilityRecord[]> {
    const records = await this.db.patrimonyLiability.findMany({
      where: {
        userId,
        ...(options?.includeInactive ? {} : { estaAtivo: true }),
      },
      orderBy: { nome: "asc" },
    });
    return records.map(toLiability);
  }

  async findByIdForUser(id: string, userId: string): Promise<PatrimonyLiabilityRecord | null> {
    const record = await this.db.patrimonyLiability.findFirst({ where: { id, userId } });
    return record ? toLiability(record) : null;
  }

  async create(input: CreatePatrimonyLiabilityInput): Promise<PatrimonyLiabilityRecord> {
    const record = await this.db.patrimonyLiability.create({
      data: {
        userId: input.userId,
        nome: input.nome,
        descricao: input.descricao,
        tipo: input.tipo,
        saldoOriginal: input.saldoOriginal,
        saldoAtual: input.saldoAtual ?? input.saldoOriginal,
        taxaJuros: input.taxaJuros ?? null,
        dataContratacao: input.dataContratacao ?? null,
        dataQuitacaoPrevista: input.dataQuitacaoPrevista ?? null,
        observacoes: input.observacoes,
      },
    });
    return toLiability(record);
  }

  async update(
    id: string,
    userId: string,
    input: UpdatePatrimonyLiabilityInput,
  ): Promise<PatrimonyLiabilityRecord | null> {
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) return null;

    const record = await this.db.patrimonyLiability.update({
      where: { id },
      data: {
        ...(input.nome !== undefined ? { nome: input.nome } : {}),
        ...(input.descricao !== undefined ? { descricao: input.descricao } : {}),
        ...(input.tipo !== undefined ? { tipo: input.tipo } : {}),
        ...(input.saldoOriginal !== undefined ? { saldoOriginal: input.saldoOriginal } : {}),
        ...(input.saldoAtual !== undefined ? { saldoAtual: input.saldoAtual } : {}),
        ...(input.taxaJuros !== undefined ? { taxaJuros: input.taxaJuros } : {}),
        ...(input.dataContratacao !== undefined ? { dataContratacao: input.dataContratacao } : {}),
        ...(input.dataQuitacaoPrevista !== undefined
          ? { dataQuitacaoPrevista: input.dataQuitacaoPrevista }
          : {}),
        ...(input.estaAtivo !== undefined ? { estaAtivo: input.estaAtivo } : {}),
        ...(input.observacoes !== undefined ? { observacoes: input.observacoes } : {}),
      },
    });
    return toLiability(record);
  }

  async deleteById(id: string, userId: string): Promise<boolean> {
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) return false;
    await this.db.patrimonyLiability.delete({ where: { id } });
    return true;
  }

  async countUsage(id: string): Promise<number> {
    const [txCount, assetLink, mainTxCount, recurringCount] = await Promise.all([
      this.db.patrimonyTransaction.count({ where: { liabilityId: id } }),
      this.db.patrimonyAsset.count({ where: { linkedLiabilityId: id } }),
      this.db.transaction.count({ where: { liabilityId: id } }),
      this.db.lancamentoRecorrente.count({ where: { liabilityId: id } }),
    ]);
    return txCount + assetLink + mainTxCount + recurringCount;
  }
}

export class PrismaPatrimonyTransactionRepository implements PatrimonyTransactionRepositoryPort {
  constructor(private readonly db: PrismaDb) {}

  async create(input: RegisterPatrimonyTransactionInput): Promise<PatrimonyTransactionRecord> {
    const record = await this.db.patrimonyTransaction.create({
      data: {
        userId: input.userId,
        assetId: input.assetId,
        liabilityId: input.liabilityId,
        tipo: input.tipo,
        valorTotal: input.valorTotal,
        data: input.data,
        descricao: input.descricao,
        mainTransactionId: input.mainTransactionId,
      },
    });
    return toTransaction(record);
  }

  async createMany(inputs: RegisterPatrimonyTransactionInput[]): Promise<PatrimonyTransactionRecord[]> {
    const results: PatrimonyTransactionRecord[] = [];
    for (const input of inputs) {
      results.push(await this.create(input));
    }
    return results;
  }

  async listByAssetId(assetId: string, userId: string): Promise<PatrimonyTransactionRecord[]> {
    const records = await this.db.patrimonyTransaction.findMany({
      where: { assetId, userId },
      orderBy: { data: "desc" },
    });
    return records.map(toTransaction);
  }

  async listByLiabilityId(liabilityId: string, userId: string): Promise<PatrimonyTransactionRecord[]> {
    const records = await this.db.patrimonyTransaction.findMany({
      where: { liabilityId, userId },
      orderBy: { data: "desc" },
    });
    return records.map(toTransaction);
  }
}
