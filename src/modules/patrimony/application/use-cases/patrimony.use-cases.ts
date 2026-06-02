import { PatrimonyError } from "../../domain/errors/patrimony.error";
import type {
  AssetValuationInput,
  ConsortiumContemplationInput,
  ConsortiumParcelInput,
  CreatePatrimonyAssetInput,
  CreatePatrimonyLiabilityInput,
  FinancingPaymentInput,
  InvestmentTransactionInput,
  PatrimonyAssetRepositoryPort,
  PatrimonyLiabilityRepositoryPort,
  PatrimonyUnitOfWorkPort,
  UpdatePatrimonyAssetInput,
  UpdatePatrimonyLiabilityInput,
} from "../../domain/ports/patrimony.port";

export class ListPatrimonyAssetsUseCase {
  constructor(private readonly repository: PatrimonyAssetRepositoryPort) {}

  execute(userId: string, options?: { includeInactive?: boolean }) {
    return this.repository.listByUserId(userId, options);
  }
}

export class GetPatrimonyAssetUseCase {
  constructor(private readonly repository: PatrimonyAssetRepositoryPort) {}

  async execute(id: string, userId: string) {
    const asset = await this.repository.findByIdForUser(id, userId);
    if (!asset) {
      throw new PatrimonyError("Ativo não encontrado.", "NOT_FOUND");
    }
    return asset;
  }
}

export class CreatePatrimonyAssetUseCase {
  constructor(
    private readonly repository: PatrimonyAssetRepositoryPort,
    private readonly liabilityRepository: PatrimonyLiabilityRepositoryPort,
  ) {}

  async execute(input: CreatePatrimonyAssetInput) {
    if (input.linkedLiabilityId) {
      const liability = await this.liabilityRepository.findByIdForUser(
        input.linkedLiabilityId,
        input.userId,
      );
      if (!liability) {
        throw new PatrimonyError("Passivo vinculado não encontrado.", "VALIDATION");
      }
    }

    return this.repository.create(input);
  }
}

export class UpdatePatrimonyAssetUseCase {
  constructor(
    private readonly repository: PatrimonyAssetRepositoryPort,
    private readonly liabilityRepository: PatrimonyLiabilityRepositoryPort,
  ) {}

  async execute(id: string, userId: string, input: UpdatePatrimonyAssetInput) {
    if (input.linkedLiabilityId) {
      const liability = await this.liabilityRepository.findByIdForUser(
        input.linkedLiabilityId,
        userId,
      );
      if (!liability) {
        throw new PatrimonyError("Passivo vinculado não encontrado.", "VALIDATION");
      }
    }

    const updated = await this.repository.update(id, userId, input);
    if (!updated) {
      throw new PatrimonyError("Ativo não encontrado.", "NOT_FOUND");
    }
    return updated;
  }
}

export class DeletePatrimonyAssetUseCase {
  constructor(private readonly repository: PatrimonyAssetRepositoryPort) {}

  async execute(id: string, userId: string): Promise<"soft"> {
    const existing = await this.repository.findByIdForUser(id, userId);
    if (!existing) {
      throw new PatrimonyError("Ativo não encontrado.", "NOT_FOUND");
    }

    const updated = await this.repository.update(id, userId, {
      estaAtivo: false,
      linkedLiabilityId: null,
    });
    if (!updated) {
      throw new PatrimonyError("Ativo não encontrado.", "NOT_FOUND");
    }
    return "soft";
  }
}

export class ListPatrimonyLiabilitiesUseCase {
  constructor(private readonly repository: PatrimonyLiabilityRepositoryPort) {}

  execute(userId: string, options?: { includeInactive?: boolean }) {
    return this.repository.listByUserId(userId, options);
  }
}

export class CreatePatrimonyLiabilityUseCase {
  constructor(private readonly repository: PatrimonyLiabilityRepositoryPort) {}

  execute(input: CreatePatrimonyLiabilityInput) {
    return this.repository.create(input);
  }
}

export class UpdatePatrimonyLiabilityUseCase {
  constructor(private readonly repository: PatrimonyLiabilityRepositoryPort) {}

  async execute(id: string, userId: string, input: UpdatePatrimonyLiabilityInput) {
    const updated = await this.repository.update(id, userId, input);
    if (!updated) {
      throw new PatrimonyError("Passivo não encontrado.", "NOT_FOUND");
    }
    return updated;
  }
}

export class DeletePatrimonyLiabilityUseCase {
  constructor(private readonly repository: PatrimonyLiabilityRepositoryPort) {}

  async execute(id: string, userId: string): Promise<"soft"> {
    const existing = await this.repository.findByIdForUser(id, userId);
    if (!existing) {
      throw new PatrimonyError("Passivo não encontrado.", "NOT_FOUND");
    }

    await this.repository.update(id, userId, { estaAtivo: false });
    return "soft";
  }
}

export class GetPatrimonySummaryUseCase {
  constructor(private readonly unitOfWork: PatrimonyUnitOfWorkPort) {}

  execute(userId: string) {
    return this.unitOfWork.getSummary(userId);
  }
}

export class RegisterInvestmentTransactionUseCase {
  constructor(private readonly unitOfWork: PatrimonyUnitOfWorkPort) {}

  execute(input: InvestmentTransactionInput) {
    return this.unitOfWork.registerInvestmentTransaction(input);
  }
}

export class RegisterFinancingPaymentUseCase {
  constructor(private readonly unitOfWork: PatrimonyUnitOfWorkPort) {}

  execute(input: FinancingPaymentInput) {
    return this.unitOfWork.registerFinancingPayment(input);
  }
}

export class RegisterConsortiumParcelUseCase {
  constructor(private readonly unitOfWork: PatrimonyUnitOfWorkPort) {}

  execute(input: ConsortiumParcelInput) {
    return this.unitOfWork.registerConsortiumParcel(input);
  }
}

export class RegisterConsortiumContemplationUseCase {
  constructor(private readonly unitOfWork: PatrimonyUnitOfWorkPort) {}

  execute(input: ConsortiumContemplationInput) {
    return this.unitOfWork.registerConsortiumContemplation(input);
  }
}

export class RegisterAssetValuationUseCase {
  constructor(private readonly unitOfWork: PatrimonyUnitOfWorkPort) {}

  execute(input: AssetValuationInput) {
    return this.unitOfWork.registerAssetValuation(input);
  }
}
