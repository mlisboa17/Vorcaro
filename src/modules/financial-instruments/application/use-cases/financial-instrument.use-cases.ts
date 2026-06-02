import { InstrumentConfigError } from "../../domain/errors/instrument-config.error";
import type {
  CardRepositoryPort,
  CreateCardInput,
  CreateFinancialAccountInput,
  CreatePaymentMethodInput,
  FinancialAccountRepositoryPort,
  ListInstrumentsOptions,
  PaymentMethodRepositoryPort,
  UpdateCardInput,
  UpdateFinancialAccountInput,
  UpdatePaymentMethodInput,
} from "../../domain/ports/financial-instrument.port";

export class ListFinancialAccountsUseCase {
  constructor(private readonly repository: FinancialAccountRepositoryPort) {}

  execute(userId: string, options?: ListInstrumentsOptions) {
    return this.repository.listByUserId(userId, options);
  }
}

export class CreateFinancialAccountUseCase {
  constructor(private readonly repository: FinancialAccountRepositoryPort) {}

  execute(input: CreateFinancialAccountInput) {
    return this.repository.create(input);
  }
}

export class UpdateFinancialAccountUseCase {
  constructor(private readonly repository: FinancialAccountRepositoryPort) {}

  async execute(accountId: string, userId: string, input: UpdateFinancialAccountInput) {
    const existing = await this.repository.findByIdForUser(accountId, userId);

    if (!existing) {
      throw new InstrumentConfigError("Conta financeira não encontrada.", "NOT_FOUND");
    }

    const updated = await this.repository.update(accountId, userId, input);

    if (!updated) {
      throw new InstrumentConfigError("Conta financeira não encontrada.", "NOT_FOUND");
    }

    return updated;
  }
}

export class DeleteFinancialAccountUseCase {
  constructor(private readonly repository: FinancialAccountRepositoryPort) {}

  async execute(accountId: string, userId: string): Promise<"soft" | "hard"> {
    const existing = await this.repository.findByIdForUser(accountId, userId);

    if (!existing) {
      throw new InstrumentConfigError("Conta financeira não encontrada.", "NOT_FOUND");
    }

    const usage = await this.repository.countUsage(accountId);

    if (usage > 0) {
      await this.repository.update(accountId, userId, { isActive: false });
      return "soft";
    }

    const deleted = await this.repository.deleteById(accountId, userId);

    if (!deleted) {
      throw new InstrumentConfigError("Conta financeira não encontrada.", "NOT_FOUND");
    }

    return "hard";
  }
}

export class ListPaymentMethodsUseCase {
  constructor(private readonly repository: PaymentMethodRepositoryPort) {}

  execute(userId: string, options?: ListInstrumentsOptions) {
    return this.repository.listByUserId(userId, options);
  }
}

export class CreatePaymentMethodUseCase {
  constructor(private readonly repository: PaymentMethodRepositoryPort) {}

  execute(input: CreatePaymentMethodInput) {
    return this.repository.create(input);
  }
}

export class UpdatePaymentMethodUseCase {
  constructor(private readonly repository: PaymentMethodRepositoryPort) {}

  async execute(paymentMethodId: string, userId: string, input: UpdatePaymentMethodInput) {
    const existing = await this.repository.findByIdForUser(paymentMethodId, userId);

    if (!existing) {
      throw new InstrumentConfigError("Forma de pagamento não encontrada.", "NOT_FOUND");
    }

    const updated = await this.repository.update(paymentMethodId, userId, input);

    if (!updated) {
      throw new InstrumentConfigError("Forma de pagamento não encontrada.", "NOT_FOUND");
    }

    return updated;
  }
}

export class DeletePaymentMethodUseCase {
  constructor(private readonly repository: PaymentMethodRepositoryPort) {}

  async execute(paymentMethodId: string, userId: string): Promise<"soft" | "hard"> {
    const existing = await this.repository.findByIdForUser(paymentMethodId, userId);

    if (!existing) {
      throw new InstrumentConfigError("Forma de pagamento não encontrada.", "NOT_FOUND");
    }

    const usage = await this.repository.countUsage(paymentMethodId);

    if (usage > 0) {
      await this.repository.update(paymentMethodId, userId, { isActive: false });
      return "soft";
    }

    const deleted = await this.repository.deleteById(paymentMethodId, userId);

    if (!deleted) {
      throw new InstrumentConfigError("Forma de pagamento não encontrada.", "NOT_FOUND");
    }

    return "hard";
  }
}

export class ListCardsUseCase {
  constructor(private readonly repository: CardRepositoryPort) {}

  execute(userId: string, options?: ListInstrumentsOptions) {
    return this.repository.listByUserId(userId, options);
  }
}

export class CreateCardUseCase {
  constructor(private readonly repository: CardRepositoryPort) {}

  execute(input: CreateCardInput) {
    return this.repository.create(input);
  }
}

export class UpdateCardUseCase {
  constructor(private readonly repository: CardRepositoryPort) {}

  async execute(cardId: string, userId: string, input: UpdateCardInput) {
    const existing = await this.repository.findByIdForUser(cardId, userId);

    if (!existing) {
      throw new InstrumentConfigError("Cartão não encontrado.", "NOT_FOUND");
    }

    const updated = await this.repository.update(cardId, userId, input);

    if (!updated) {
      throw new InstrumentConfigError("Cartão não encontrado.", "NOT_FOUND");
    }

    return updated;
  }
}

export class DeleteCardUseCase {
  constructor(private readonly repository: CardRepositoryPort) {}

  async execute(cardId: string, userId: string): Promise<"soft" | "hard"> {
    const existing = await this.repository.findByIdForUser(cardId, userId);

    if (!existing) {
      throw new InstrumentConfigError("Cartão não encontrado.", "NOT_FOUND");
    }

    const usage = await this.repository.countUsage(cardId);

    if (usage > 0) {
      await this.repository.update(cardId, userId, { isActive: false });
      return "soft";
    }

    const deleted = await this.repository.deleteById(cardId, userId);

    if (!deleted) {
      throw new InstrumentConfigError("Cartão não encontrado.", "NOT_FOUND");
    }

    return "hard";
  }
}
