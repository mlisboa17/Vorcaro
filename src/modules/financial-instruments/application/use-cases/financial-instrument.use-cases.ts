import type {
  CardRepositoryPort,
  CreateCardInput,
  CreateFinancialAccountInput,
  CreatePaymentMethodInput,
  FinancialAccountRepositoryPort,
  PaymentMethodRepositoryPort,
  UpdateCardInput,
} from "../../domain/ports/financial-instrument.port";

export class ListFinancialAccountsUseCase {
  constructor(private readonly repository: FinancialAccountRepositoryPort) {}

  execute(userId: string) {
    return this.repository.listByUserId(userId);
  }
}

export class CreateFinancialAccountUseCase {
  constructor(private readonly repository: FinancialAccountRepositoryPort) {}

  execute(input: CreateFinancialAccountInput) {
    return this.repository.create(input);
  }
}

export class ListPaymentMethodsUseCase {
  constructor(private readonly repository: PaymentMethodRepositoryPort) {}

  execute(userId: string) {
    return this.repository.listByUserId(userId);
  }
}

export class CreatePaymentMethodUseCase {
  constructor(private readonly repository: PaymentMethodRepositoryPort) {}

  execute(input: CreatePaymentMethodInput) {
    return this.repository.create(input);
  }
}

export class ListCardsUseCase {
  constructor(private readonly repository: CardRepositoryPort) {}

  execute(userId: string) {
    return this.repository.listByUserId(userId);
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

  execute(cardId: string, userId: string, input: UpdateCardInput) {
    return this.repository.update(cardId, userId, input);
  }
}
