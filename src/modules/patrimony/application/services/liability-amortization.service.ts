import {
  computeNextLiabilityBalance,
  computeRestoredLiabilityBalance,
  getAmortizacaoAplicadaFromMetadata,
  stampAmortizacaoAplicada,
  sumAmortizacaoFromMetadata,
  type TransactionAllocation,
} from "@/lib/financial/liability-payment-metadata";
import { PatrimonyError } from "../../domain/errors/patrimony.error";
import type { PatrimonyLiabilityRepositoryPort } from "../../domain/ports/patrimony.port";

export class LiabilityAmortizationService {
  constructor(private readonly liabilityRepository: PatrimonyLiabilityRepositoryPort) {}

  async revertAppliedAmortization(params: {
    liabilityId: string;
    userId: string;
    metadata: unknown;
  }): Promise<void> {
    const amount = getAmortizacaoAplicadaFromMetadata(params.metadata);

    if (amount <= 0) {
      return;
    }

    const liability = await this.liabilityRepository.findByIdForUser(
      params.liabilityId,
      params.userId,
    );

    if (!liability) {
      throw new PatrimonyError("Passivo não encontrado.", "NOT_FOUND");
    }

    const saldoAtual = computeRestoredLiabilityBalance(liability.saldoAtual, amount);

    await this.liabilityRepository.update(params.liabilityId, params.userId, { saldoAtual });
  }

  async applyAmortization(params: {
    liabilityId: string;
    userId: string;
    metadata: Record<string, unknown>;
    allocations?: TransactionAllocation[];
  }): Promise<Record<string, unknown>> {
    const amortizacao = sumAmortizacaoFromMetadata(params.metadata);

    if (amortizacao <= 0) {
      return params.metadata;
    }

    const liability = await this.liabilityRepository.findByIdForUser(
      params.liabilityId,
      params.userId,
    );

    if (!liability) {
      throw new PatrimonyError("Passivo não encontrado.", "NOT_FOUND");
    }

    const saldoAtual = computeNextLiabilityBalance(liability.saldoAtual, amortizacao);

    await this.liabilityRepository.update(params.liabilityId, params.userId, { saldoAtual });

    return stampAmortizacaoAplicada(params.metadata, amortizacao);
  }

  async syncTransactionAmortization(params: {
    userId: string;
    previousLiabilityId: string | null;
    previousMetadata: unknown;
    nextLiabilityId: string | null;
    nextMetadata: Record<string, unknown>;
    allocations?: TransactionAllocation[];
  }): Promise<Record<string, unknown>> {
    if (params.previousLiabilityId) {
      await this.revertAppliedAmortization({
        liabilityId: params.previousLiabilityId,
        userId: params.userId,
        metadata: params.previousMetadata,
      });
    }

    if (!params.nextLiabilityId) {
      return params.nextMetadata;
    }

    return this.applyAmortization({
      liabilityId: params.nextLiabilityId,
      userId: params.userId,
      metadata: params.nextMetadata,
      allocations: params.allocations,
    });
  }
}
