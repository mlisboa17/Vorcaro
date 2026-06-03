import type {
  InstallmentExecutiveSnapshotDto,
  InstallmentFutureCommitmentDto,
  InstallmentGroupDetailDto,
  InstallmentGroupDto,
  InstallmentGroupTransactionDto,
  InstallmentSummaryDto,
} from "../../domain/types/installment-group.dto";
import type { InstallmentTransactionRecord } from "../../domain/ports/installment-read-model.port";
import type { InstallmentReadModelRepositoryPort } from "../../domain/ports/installment-read-model.port";
import {
  centsToAmount,
  decimalToCents,
  formatIsoDateUtc,
  isExcludedFromInstallmentReadModel,
  isInstallmentPaid,
  normalizeInstallmentGroupKey,
  resolveInstallmentGroupKey,
  resolveInstallmentReferenceDate,
  resolveParcelaNumber,
  resolveParcelStatus,
  resolveTotalParcelas,
  startOfUtcDay,
} from "../../domain/installment-read-rules";

type ParcelSlice = {
  tx: InstallmentTransactionRecord;
  parcela: number;
  amountCents: number;
  referenceDate: Date;
  paid: boolean;
};

function buildParcelSlices(txs: InstallmentTransactionRecord[], today: Date): ParcelSlice[] {
  const byParcela = new Map<number, ParcelSlice>();
  const withoutParcela: InstallmentTransactionRecord[] = [];

  for (const tx of txs) {
    if (isExcludedFromInstallmentReadModel(tx.description)) continue;

    const parcela = resolveParcelaNumber(tx);
    const amountCents = decimalToCents(tx.amount);
    const referenceDate = resolveInstallmentReferenceDate(tx);
    const paid = isInstallmentPaid(tx, today);

    if (parcela != null) {
      const existing = byParcela.get(parcela);
      if (!existing || amountCents > existing.amountCents) {
        byParcela.set(parcela, { tx, parcela, amountCents, referenceDate, paid });
      }
      continue;
    }

    withoutParcela.push(tx);
  }

  const used = new Set(byParcela.keys());
  let nextAuto = 1;
  const sortedOrphans = withoutParcela.sort(
    (a, b) => resolveInstallmentReferenceDate(a).getTime() - resolveInstallmentReferenceDate(b).getTime(),
  );

  for (const tx of sortedOrphans) {
    while (used.has(nextAuto)) nextAuto += 1;
    const parcela = nextAuto;
    used.add(parcela);
    nextAuto += 1;
    byParcela.set(parcela, {
      tx,
      parcela,
      amountCents: decimalToCents(tx.amount),
      referenceDate: resolveInstallmentReferenceDate(tx),
      paid: isInstallmentPaid(tx, today),
    });
  }

  return [...byParcela.values()].sort((a, b) => a.parcela - b.parcela);
}

function buildGroupDto(
  groupKey: string,
  txs: InstallmentTransactionRecord[],
  today: Date,
  parcelamentoEstruturado: boolean,
): InstallmentGroupDto | null {
  const eligible = txs.filter((tx) => !isExcludedFromInstallmentReadModel(tx.description));
  if (eligible.length === 0) return null;

  const slices = buildParcelSlices(eligible, today);
  if (slices.length === 0) return null;

  const totalParcelas = resolveTotalParcelas(eligible, slices.length);
  const parcelasPagas = slices.filter((s) => s.paid).length;
  const parcelasRestantes = Math.max(0, totalParcelas - parcelasPagas);

  const valorTotalCents = slices.reduce((sum, s) => sum + s.amountCents, 0);
  const valorPagoCents = slices.filter((s) => s.paid).reduce((sum, s) => sum + s.amountCents, 0);
  const valorRestanteCents = Math.max(0, valorTotalCents - valorPagoCents);

  const unpaid = slices.filter((s) => !s.paid);
  const parcelaAtual = unpaid.length > 0 ? Math.min(...unpaid.map((s) => s.parcela)) : null;

  const firstSlice = slices[0]!;
  const parcela1 = slices.find((s) => s.parcela === 1) ?? firstSlice;
  const valorParcelaCents =
    parcela1.amountCents > 0
      ? parcela1.amountCents
      : totalParcelas > 0
        ? Math.round(valorTotalCents / totalParcelas)
        : valorTotalCents;

  const dates = slices.map((s) => s.referenceDate);
  const primeiraParcela = formatIsoDateUtc(
    new Date(Math.min(...dates.map((d) => d.getTime()))),
  );
  const ultimaParcela = formatIsoDateUtc(new Date(Math.max(...dates.map((d) => d.getTime()))));

  const descricao =
    eligible.find((t) => resolveParcelaNumber(t) === 1)?.description ??
    eligible[0]?.description ??
    "Parcelamento";

  const descricaoBase =
    eligible.find((t) => resolveParcelaNumber(t) === 1)?.description ?? descricao;

  const categoryTx = eligible.find((t) => t.category?.name) ?? eligible[0];
  const cardTx = eligible.find((t) => t.card?.name) ?? eligible[0];

  const status: InstallmentGroupDto["status"] =
    parcelasRestantes === 0 ? "CONCLUIDO" : "ATIVO";

  return {
    installmentGroup: groupKey,
    descricao: descricaoBase,
    totalParcelas,
    parcelaAtual,
    valorParcela: centsToAmount(valorParcelaCents),
    valorTotal: centsToAmount(valorTotalCents),
    parcelasPagas,
    parcelasRestantes,
    valorPago: centsToAmount(valorPagoCents),
    valorRestante: centsToAmount(valorRestanteCents),
    primeiraParcela,
    ultimaParcela,
    categoria: categoryTx?.category?.name ?? null,
    cartao: cardTx?.card?.name ?? null,
    status,
    parcelamentoEstruturado,
  };
}

function groupTransactionsByKey(
  records: InstallmentTransactionRecord[],
): Map<string, { txs: InstallmentTransactionRecord[]; structured: boolean }> {
  const map = new Map<string, { txs: InstallmentTransactionRecord[]; structured: boolean }>();

  for (const tx of records) {
    const resolved = resolveInstallmentGroupKey(tx);
    if (!resolved) continue;

    const existing = map.get(resolved.key);
    if (existing) {
      existing.txs.push(tx);
      existing.structured = existing.structured && resolved.structured;
      continue;
    }

    map.set(resolved.key, { txs: [tx], structured: resolved.structured });
  }

  return map;
}

function mapSliceToTransactionDto(s: ParcelSlice, today: Date): InstallmentGroupTransactionDto {
  const ref = s.referenceDate;
  return {
    id: s.tx.id,
    description: s.tx.description,
    amount: centsToAmount(s.amountCents),
    date: s.tx.date.toISOString(),
    dataCaixa: s.tx.dataCaixa?.toISOString() ?? null,
    dataVencimentoFatura: s.tx.dataVencimentoFatura?.toISOString() ?? null,
    dataVencimento: formatIsoDateUtc(ref),
    numeroParcela: s.parcela,
    totalParcelas: s.tx.totalParcelas ?? s.tx.totalInstallments,
    category: s.tx.category?.name ?? null,
    card: s.tx.card?.name ?? null,
    status: resolveParcelStatus(s.paid, ref, today),
  };
}

function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export class InstallmentReadModelService {
  constructor(private readonly repository: InstallmentReadModelRepositoryPort) {}

  async listGroups(userId: string): Promise<InstallmentGroupDto[]> {
    const records = await this.repository.findInstallmentTransactions(userId);
    const today = startOfUtcDay(new Date());
    const grouped = groupTransactionsByKey(records);
    const result: InstallmentGroupDto[] = [];

    for (const [key, group] of grouped) {
      const dto = buildGroupDto(key, group.txs, today, group.structured);
      if (dto) result.push(dto);
    }

    result.sort((a, b) => a.primeiraParcela.localeCompare(b.primeiraParcela));
    return result;
  }

  async isGroupForbiddenForUser(userId: string, groupId: string): Promise<boolean> {
    const owned = await this.repository.findTransactionsByGroup(userId, groupId);
    if (owned.length > 0) return false;
    return this.repository.existsGroupForOtherUser(groupId, userId);
  }

  async getGroupDetail(userId: string, groupId: string): Promise<InstallmentGroupDetailDto | null> {
    const records = await this.repository.findTransactionsByGroup(userId, groupId);
    if (records.length === 0) return null;

    const today = startOfUtcDay(new Date());
    const eligible = records.filter((tx) => !isExcludedFromInstallmentReadModel(tx.description));
    const slices = buildParcelSlices(eligible, today);

    if (slices.length === 0) return null;

    const group = buildGroupDto(groupId, eligible, today, !groupId.startsWith("unstruct_"));
    if (!group) return null;

    return {
      installmentGroup: group.installmentGroup,
      descricao: group.descricao,
      valorTotal: group.valorTotal,
      valorPago: group.valorPago,
      valorRestante: group.valorRestante,
      totalParcelas: group.totalParcelas,
      parcelasPagas: group.parcelasPagas,
      parcelasRestantes: group.parcelasRestantes,
      status: group.status,
      categoria: group.categoria,
      cartao: group.cartao,
      transactions: slices.map((s) => mapSliceToTransactionDto(s, today)),
    };
  }

  async getGroupTransactions(
    userId: string,
    groupId: string,
  ): Promise<InstallmentGroupTransactionDto[] | null> {
    const detail = await this.getGroupDetail(userId, groupId);
    return detail?.transactions ?? null;
  }

  /** Dashboard executivo — snapshot agregado. */
  async getExecutiveSnapshot(userId: string): Promise<InstallmentExecutiveSnapshotDto> {
    const summary = await this.getSummary(userId);
    const groups = await this.listGroups(userId);
    const today = startOfUtcDay(new Date());
    const limit30 = addDaysUtc(today, 30);

    const commitments = await this.getFutureCommitments(userId);
    const parcelasAVencer30Dias = commitments.filter((c) => {
      const d = new Date(`${c.data}T12:00:00.000Z`);
      return d.getTime() <= limit30.getTime();
    }).length;

    const byCard = new Map<string, number>();
    for (const g of groups) {
      if (g.status !== "ATIVO" || !g.cartao) continue;
      byCard.set(g.cartao, (byCard.get(g.cartao) ?? 0) + g.valorRestante);
    }

    let cartaoMaiorConcentracao: InstallmentExecutiveSnapshotDto["cartaoMaiorConcentracao"] =
      null;
    if (summary.valorRestante > 0 && byCard.size > 0) {
      let topName = "";
      let topValue = 0;
      for (const [nome, valor] of byCard) {
        if (valor > topValue) {
          topName = nome;
          topValue = valor;
        }
      }
      cartaoMaiorConcentracao = {
        nome: topName,
        valorRestante: topValue,
        percentualDoTotal: Math.round((topValue / summary.valorRestante) * 1000) / 10,
      };
    }

    return {
      valorRestante: summary.valorRestante,
      planosAtivos: summary.planosAtivos,
      parcelasAVencer30Dias,
      cartaoMaiorConcentracao,
    };
  }

  /** Advisor, insights e cards executivos. */
  async getSummary(userId: string): Promise<InstallmentSummaryDto> {
    const groups = await this.listGroups(userId);

    let parceladoTotalCents = 0;
    let valorJaPagoCents = 0;
    let parcelasRestantes = 0;
    let planosAtivos = 0;
    let planosConcluidos = 0;

    for (const g of groups) {
      parceladoTotalCents += Math.round(g.valorTotal * 100);
      valorJaPagoCents += Math.round(g.valorPago * 100);
      parcelasRestantes += g.parcelasRestantes;
      if (g.status === "ATIVO") planosAtivos += 1;
      else planosConcluidos += 1;
    }

    const valorRestanteCents = Math.max(0, parceladoTotalCents - valorJaPagoCents);

    return {
      parceladoTotal: centsToAmount(parceladoTotalCents),
      valorJaPago: centsToAmount(valorJaPagoCents),
      valorRestante: centsToAmount(valorRestanteCents),
      parcelasRestantes,
      planosAtivos,
      planosConcluidos,
    };
  }

  /** CashflowProjectionService — compromissos futuros (com anti-duplicidade na projeção). */
  async getFutureCommitments(userId: string): Promise<InstallmentFutureCommitmentDto[]> {
    const records = await this.repository.findInstallmentTransactions(userId);
    const today = startOfUtcDay(new Date());
    const grouped = groupTransactionsByKey(records);
    const commitments: InstallmentFutureCommitmentDto[] = [];

    for (const [key, group] of grouped) {
      const eligible = group.txs.filter((tx) => !isExcludedFromInstallmentReadModel(tx.description));
      const slices = buildParcelSlices(eligible, today);

      for (const s of slices) {
        if (s.paid) continue;
        const ref = startOfUtcDay(s.referenceDate);
        if (ref.getTime() <= today.getTime()) continue;

        commitments.push({
          transactionId: s.tx.id,
          installmentGroup: key,
          descricao: s.tx.description,
          numeroParcela: s.parcela,
          valor: centsToAmount(s.amountCents),
          data: formatIsoDateUtc(ref),
          cartao: s.tx.card?.name ?? null,
          cardId: s.tx.card?.id ?? null,
        });
      }
    }

    commitments.sort((a, b) => a.data.localeCompare(b.data));
    return commitments;
  }
}
