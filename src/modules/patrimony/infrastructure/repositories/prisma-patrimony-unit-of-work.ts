import type { AssetType, LiabilityType, PrismaClient } from "@prisma/client";
import { PatrimonyError } from "../../domain/errors/patrimony.error";
import type {
  AssetValuationInput,
  ConsortiumContemplationInput,
  ConsortiumParcelInput,
  FinancingPaymentInput,
  InvestmentTransactionInput,
  PatrimonySummary,
  PatrimonyUnitOfWorkPort,
  RegisterPatrimonyTransactionInput,
} from "../../domain/ports/patrimony.port";
import {
  applyAssetValueDelta,
  applyLiabilityBalanceDelta,
  assertAssetSupportsConsortium,
  assertAssetSupportsInvestment,
  assertAssetSupportsValuation,
  calculateAssetValuationImpact,
  calculateConsortiumParcelImpact,
  calculateFinancingPaymentImpact,
  calculateInvestmentImpact,
} from "../../domain/services/patrimony-accounting.service";
import {
  PrismaPatrimonyAssetRepository,
  PrismaPatrimonyLiabilityRepository,
  PrismaPatrimonyTransactionRepository,
} from "./prisma-patrimony.repositories";

const EMPTY_ASSET_TYPES = [
  "CONSORCIO",
  "INVESTIMENTO",
  "BEM",
  "DIREITO_RECEBER",
  "ADIANTAMENTO",
  "VEHICLE",
  "REAL_ESTATE",
  "INVESTMENT",
  "CONSORTIUM",
  "RECEIVABLE",
  "OTHER",
] as const satisfies readonly AssetType[];

const EMPTY_LIABILITY_TYPES = [
  "EMPRESTIMO",
  "FINANCIAMENTO",
  "OBRIGACAO",
  "FINANCING",
  "LOAN",
  "CREDIT_LINE",
  "OTHER",
] as const satisfies readonly LiabilityType[];

function emptyAssetMap(): Record<AssetType, number> {
  return Object.fromEntries(EMPTY_ASSET_TYPES.map((t) => [t, 0])) as Record<AssetType, number>;
}

function emptyLiabilityMap(): Record<LiabilityType, number> {
  return Object.fromEntries(EMPTY_LIABILITY_TYPES.map((t) => [t, 0])) as Record<LiabilityType, number>;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export class PrismaPatrimonyUnitOfWork implements PatrimonyUnitOfWorkPort {
  private readonly assets: PrismaPatrimonyAssetRepository;
  private readonly liabilities: PrismaPatrimonyLiabilityRepository;
  private readonly transactions: PrismaPatrimonyTransactionRepository;

  constructor(private readonly db: PrismaClient) {
    this.assets = new PrismaPatrimonyAssetRepository(db);
    this.liabilities = new PrismaPatrimonyLiabilityRepository(db);
    this.transactions = new PrismaPatrimonyTransactionRepository(db);
  }

  async registerInvestmentTransaction(input: InvestmentTransactionInput) {
    const asset = await this.assets.findByIdForUser(input.assetId, input.userId);
    if (!asset) {
      throw new PatrimonyError("Ativo não encontrado.", "NOT_FOUND");
    }

    assertAssetSupportsInvestment(asset.tipo);
    const impact = calculateInvestmentImpact(input.tipo, input.valorTotal);

    const updated = await this.db.$transaction(async (tx) => {
      const txRepo = new PrismaPatrimonyTransactionRepository(tx);
      const assetRepo = new PrismaPatrimonyAssetRepository(tx);

      await txRepo.create({
        userId: input.userId,
        assetId: input.assetId,
        tipo: input.tipo,
        valorTotal: input.valorTotal,
        data: input.data,
        descricao: input.descricao,
        mainTransactionId: input.mainTransactionId,
      });

      const nextValue = applyAssetValueDelta(asset.valorAtual, impact.patrimonioBruto);
      return assetRepo.update(input.assetId, input.userId, { valorAtual: nextValue });
    });

    if (!updated) {
      throw new PatrimonyError("Falha ao atualizar ativo.", "BUSINESS_RULE");
    }

    const list = await this.transactions.listByAssetId(input.assetId, input.userId);
    return {
      transactions: list.slice(0, 1),
      asset: updated,
      impact,
    };
  }

  async registerFinancingPayment(input: FinancingPaymentInput) {
    const liability = await this.liabilities.findByIdForUser(input.liabilityId, input.userId);
    if (!liability) {
      throw new PatrimonyError("Passivo não encontrado.", "NOT_FOUND");
    }

    const impact = calculateFinancingPaymentImpact(input);
    const txInputs: RegisterPatrimonyTransactionInput[] = [];

    if (input.amortizacao > 0) {
      txInputs.push({
        userId: input.userId,
        liabilityId: input.liabilityId,
        tipo: "AMORTIZACAO",
        valorTotal: input.amortizacao,
        data: input.data,
        descricao: input.descricao,
        mainTransactionId: input.mainTransactionId,
      });
    }
    if (input.juros > 0) {
      txInputs.push({
        userId: input.userId,
        liabilityId: input.liabilityId,
        tipo: "JUROS",
        valorTotal: input.juros,
        data: input.data,
        descricao: input.descricao,
        mainTransactionId: input.mainTransactionId,
      });
    }
    if (input.seguro > 0) {
      txInputs.push({
        userId: input.userId,
        liabilityId: input.liabilityId,
        tipo: "SEGURO",
        valorTotal: input.seguro,
        data: input.data,
        descricao: input.descricao,
        mainTransactionId: input.mainTransactionId,
      });
    }
    if (input.taxa > 0) {
      txInputs.push({
        userId: input.userId,
        liabilityId: input.liabilityId,
        tipo: "TAXA",
        valorTotal: input.taxa,
        data: input.data,
        descricao: input.descricao,
        mainTransactionId: input.mainTransactionId,
      });
    }

    const updated = await this.db.$transaction(async (tx) => {
      const txRepo = new PrismaPatrimonyTransactionRepository(tx);
      const liabilityRepo = new PrismaPatrimonyLiabilityRepository(tx);

      await txRepo.createMany(txInputs);

      const nextBalance = applyLiabilityBalanceDelta(liability.saldoAtual, impact.passivo);
      return liabilityRepo.update(input.liabilityId, input.userId, { saldoAtual: nextBalance });
    });

    if (!updated) {
      throw new PatrimonyError("Falha ao atualizar passivo.", "BUSINESS_RULE");
    }

    const list = await this.transactions.listByLiabilityId(input.liabilityId, input.userId);
    return {
      transactions: list.slice(0, txInputs.length),
      liability: updated,
      impact,
    };
  }

  async registerConsortiumParcel(input: ConsortiumParcelInput) {
    const asset = await this.assets.findByIdForUser(input.assetId, input.userId);
    if (!asset) {
      throw new PatrimonyError("Ativo não encontrado.", "NOT_FOUND");
    }

    assertAssetSupportsConsortium(asset.tipo);
    const impact = calculateConsortiumParcelImpact(input);
    const fundoReserva = input.fundoReserva ?? 0;

    const updated = await this.db.$transaction(async (tx) => {
      const txRepo = new PrismaPatrimonyTransactionRepository(tx);
      const assetRepo = new PrismaPatrimonyAssetRepository(tx);

      if (input.fundoComum > 0) {
        await txRepo.create({
          userId: input.userId,
          assetId: input.assetId,
          tipo: "APORTE",
          valorTotal: input.fundoComum,
          data: input.data,
          descricao: input.descricao ?? "Fundo comum consórcio",
          mainTransactionId: input.mainTransactionId,
        });
      }

      const taxaTotal = input.taxaAdministracao + fundoReserva;
      if (taxaTotal > 0) {
        await txRepo.create({
          userId: input.userId,
          assetId: input.assetId,
          tipo: "TAXA",
          valorTotal: taxaTotal,
          data: input.data,
          descricao: input.descricao ?? "Taxas consórcio",
          mainTransactionId: input.mainTransactionId,
        });
      }

      const nextValue = applyAssetValueDelta(asset.valorAtual, impact.patrimonioBruto);
      return assetRepo.update(input.assetId, input.userId, { valorAtual: nextValue });
    });

    if (!updated) {
      throw new PatrimonyError("Falha ao atualizar consórcio.", "BUSINESS_RULE");
    }

    const list = await this.transactions.listByAssetId(input.assetId, input.userId);
    return {
      transactions: list.slice(0, 2),
      asset: updated,
      impact,
    };
  }

  async registerConsortiumContemplation(input: ConsortiumContemplationInput) {
    const consortium = await this.assets.findByIdForUser(input.consortiumAssetId, input.userId);
    if (!consortium) {
      throw new PatrimonyError("Consórcio não encontrado.", "NOT_FOUND");
    }

    assertAssetSupportsConsortium(consortium.tipo);

    return this.db.$transaction(async (tx) => {
      const assetRepo = new PrismaPatrimonyAssetRepository(tx);
      const liabilityRepo = new PrismaPatrimonyLiabilityRepository(tx);

      const closedAsset = await assetRepo.update(input.consortiumAssetId, input.userId, {
        estaAtivo: false,
        observacoes: input.descricao ?? "Contemplado",
      });

      if (!closedAsset) {
        throw new PatrimonyError("Falha ao encerrar consórcio.", "BUSINESS_RULE");
      }

      let liabilityId: string | null = null;
      let liability;

      if (input.saldoDevedorRemanescente && input.saldoDevedorRemanescente > 0) {
        liability = await liabilityRepo.create({
          userId: input.userId,
          nome: input.liabilityNome ?? `Financiamento ${input.targetAsset.nome}`,
          tipo: "FINANCING",
          saldoOriginal: input.saldoDevedorRemanescente,
          taxaJuros: 0,
          dataContratacao: input.data,
          dataQuitacaoPrevista: input.data,
        });
        liabilityId = liability.id;
      }

      const newAsset = await assetRepo.create({
        userId: input.userId,
        nome: input.targetAsset.nome,
        descricao: input.targetAsset.descricao,
        tipo: input.targetAsset.tipo,
        valorAquisicao: consortium.valorAtual,
        valorAtual: consortium.valorAtual,
        dataAquisicao: input.targetAsset.dataAquisicao,
        linkedLiabilityId: liabilityId,
      });

      return { closedAsset, newAsset, liability };
    });
  }

  async registerAssetValuation(input: AssetValuationInput) {
    const asset = await this.assets.findByIdForUser(input.assetId, input.userId);
    if (!asset) {
      throw new PatrimonyError("Ativo não encontrado.", "NOT_FOUND");
    }

    assertAssetSupportsValuation(asset.tipo);
    const impact = calculateAssetValuationImpact(input.tipo, input.valorAjuste);

    const result = await this.db.$transaction(async (tx) => {
      const txRepo = new PrismaPatrimonyTransactionRepository(tx);
      const assetRepo = new PrismaPatrimonyAssetRepository(tx);

      const transaction = await txRepo.create({
        userId: input.userId,
        assetId: input.assetId,
        tipo: input.tipo,
        valorTotal: Math.abs(input.valorAjuste),
        data: input.data,
        descricao: input.descricao,
      });

      const nextValue = applyAssetValueDelta(asset.valorAtual, impact.patrimonioBruto);
      const updatedAsset = await assetRepo.update(input.assetId, input.userId, {
        valorAtual: nextValue,
      });

      return { transaction, asset: updatedAsset };
    });

    if (!result.asset) {
      throw new PatrimonyError("Falha ao atualizar valor do bem.", "BUSINESS_RULE");
    }

    return {
      transaction: result.transaction,
      asset: result.asset,
      impact,
    };
  }

  async getSummary(userId: string): Promise<PatrimonySummary> {
    const [assets, liabilities] = await Promise.all([
      this.assets.listByUserId(userId),
      this.liabilities.listByUserId(userId),
    ]);

    const ativosPorTipo = emptyAssetMap();
    const passivosPorTipo = emptyLiabilityMap();

    let totalAtivos = 0;
    for (const asset of assets) {
      totalAtivos += asset.valorAtual;
      ativosPorTipo[asset.tipo] = (ativosPorTipo[asset.tipo] ?? 0) + asset.valorAtual;
    }

    let totalPassivos = 0;
    for (const liability of liabilities) {
      totalPassivos += liability.saldoAtual;
      passivosPorTipo[liability.tipo] = (passivosPorTipo[liability.tipo] ?? 0) + liability.saldoAtual;
    }

    const receivableAgg = await this.db.receivable.aggregate({
      where: { userId, status: { in: ["OPEN", "PARTIALLY_RECEIVED"] } },
      _sum: { valorPendente: true },
    });
    const contasAReceber = receivableAgg._sum.valorPendente?.toNumber() ?? 0;
    if (contasAReceber > 0) {
      totalAtivos += contasAReceber;
      ativosPorTipo.RECEIVABLE = (ativosPorTipo.RECEIVABLE ?? 0) + contasAReceber;
    }

    const now = new Date();
    const year = now.getUTCFullYear();
    const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const evolucaoMensal = Array.from({ length: 12 }, (_, index) => {
      const monthDate = new Date(Date.UTC(year, index, 1));
      const monthRef = monthKey(monthDate);
      const ativosMes = assets
        .filter((asset) => {
          if (!asset.dataAquisicao) return true;
          return monthKey(asset.dataAquisicao) <= monthRef;
        })
        .reduce((sum, asset) => sum + asset.valorAtual, 0);
      const passivosMes = liabilities.reduce((sum, liability) => sum + liability.saldoAtual, 0);
      return {
        mes: monthLabels[index],
        ativos: ativosMes,
        passivos: passivosMes,
        patrimonioLiquido: ativosMes - passivosMes,
      };
    });

    return {
      totalAtivos,
      totalPassivos,
      patrimonioLiquido: totalAtivos - totalPassivos,
      contasAReceber,
      ativosPorTipo,
      passivosPorTipo,
      evolucaoMensal,
    };
  }
}
