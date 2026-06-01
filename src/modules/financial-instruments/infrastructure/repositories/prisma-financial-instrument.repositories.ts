import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CardRecord,
  CardRepositoryPort,
  CreateCardInput,
  CreateFinancialAccountInput,
  CreatePaymentMethodInput,
  FinancialAccountRecord,
  FinancialAccountRepositoryPort,
  InstrumentLookupInput,
  InstrumentLookupPort,
  InstrumentLookupResult,
  PaymentMethodRecord,
  PaymentMethodRepositoryPort,
  UpdateCardInput,
} from "../../domain/ports/financial-instrument.port";
import { mapExtractedPaymentMethodType } from "../../domain/utils/payment-method-type.mapper";

function toFinancialAccount(record: {
  id: string;
  userId: string;
  name: string;
  institutionName: string | null;
  type: FinancialAccountRecord["type"];
  currency: string;
  balance: Prisma.Decimal;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): FinancialAccountRecord {
  return {
    ...record,
    balance: record.balance.toNumber(),
  };
}

function toPaymentMethod(record: {
  id: string;
  userId: string;
  name: string;
  type: PaymentMethodRecord["type"];
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PaymentMethodRecord {
  return record;
}

function toCard(record: {
  id: string;
  userId: string;
  financialAccountId: string | null;
  name: string;
  institutionName: string | null;
  brand: CardRecord["brand"];
  type: CardRecord["type"];
  lastFourDigits: string | null;
  creditLimit: Prisma.Decimal | null;
  closingDay: number | null;
  dueDay: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CardRecord {
  return {
    ...record,
    creditLimit: record.creditLimit?.toNumber() ?? null,
  };
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export class PrismaFinancialAccountRepository implements FinancialAccountRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  async listByUserId(userId: string): Promise<FinancialAccountRecord[]> {
    const records = await this.db.financialAccount.findMany({
      where: { userId, isActive: true },
      orderBy: { name: "asc" },
    });
    return records.map(toFinancialAccount);
  }

  async create(input: CreateFinancialAccountInput): Promise<FinancialAccountRecord> {
    const record = await this.db.financialAccount.create({
      data: {
        userId: input.userId,
        name: input.name,
        institutionName: input.institutionName,
        type: input.type,
        currency: input.currency ?? "BRL",
        balance: input.saldoInicial ?? 0,
      },
    });
    return toFinancialAccount(record);
  }

  async belongsToUser(accountId: string, userId: string): Promise<boolean> {
    const account = await this.db.financialAccount.findFirst({
      where: { id: accountId, userId, isActive: true },
      select: { id: true },
    });
    return account !== null;
  }

  async findByInstitution(
    userId: string,
    institutionName: string,
  ): Promise<FinancialAccountRecord | null> {
    const normalized = normalizeText(institutionName);
    const accounts = await this.db.financialAccount.findMany({
      where: { userId, isActive: true },
    });

    const match = accounts.find((account) => {
      const institution = account.institutionName ? normalizeText(account.institutionName) : "";
      const name = normalizeText(account.name);
      return institution.includes(normalized) || normalized.includes(institution) || name.includes(normalized);
    });

    return match ? toFinancialAccount(match) : null;
  }
}

export class PrismaPaymentMethodRepository implements PaymentMethodRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  async listByUserId(userId: string): Promise<PaymentMethodRecord[]> {
    const records = await this.db.paymentMethod.findMany({
      where: { userId, isActive: true },
      orderBy: { name: "asc" },
    });
    return records.map(toPaymentMethod);
  }

  async create(input: CreatePaymentMethodInput): Promise<PaymentMethodRecord> {
    const record = await this.db.paymentMethod.create({
      data: {
        userId: input.userId,
        name: input.name,
        type: input.type,
        isDefault: input.isDefault ?? false,
      },
    });
    return toPaymentMethod(record);
  }

  async belongsToUser(paymentMethodId: string, userId: string): Promise<boolean> {
    const method = await this.db.paymentMethod.findFirst({
      where: { id: paymentMethodId, userId, isActive: true },
      select: { id: true },
    });
    return method !== null;
  }

  async findByType(userId: string, type: PaymentMethodRecord["type"]): Promise<PaymentMethodRecord | null> {
    const record = await this.db.paymentMethod.findFirst({
      where: { userId, type, isActive: true },
      orderBy: { isDefault: "desc" },
    });

    if (record) {
      return toPaymentMethod(record);
    }

    const legacyType = LEGACY_PAYMENT_METHOD_TYPES[type];
    if (!legacyType) {
      return null;
    }

    const legacy = await this.db.paymentMethod.findFirst({
      where: { userId, type: legacyType, isActive: true },
      orderBy: { isDefault: "desc" },
    });

    return legacy ? toPaymentMethod(legacy) : null;
  }
}

const LEGACY_PAYMENT_METHOD_TYPES: Partial<Record<PaymentMethodRecord["type"], PaymentMethodRecord["type"]>> = {
  DINHEIRO: "CASH",
  CARTAO_CREDITO: "CREDIT_CARD",
  CARTAO_DEBITO: "DEBIT_CARD",
  TRANSFERENCIA_BANCARIA: "BANK_TRANSFER",
};

export class PrismaCardRepository implements CardRepositoryPort {
  constructor(private readonly db: PrismaClient) {}

  async listByUserId(userId: string): Promise<CardRecord[]> {
    const records = await this.db.card.findMany({
      where: { userId, isActive: true },
      orderBy: { name: "asc" },
    });
    return records.map(toCard);
  }

  async create(input: CreateCardInput): Promise<CardRecord> {
    const record = await this.db.card.create({
      data: {
        userId: input.userId,
        name: input.name,
        financialAccountId: input.financialAccountId,
        institutionName: input.institutionName,
        brand: input.brand,
        type: input.type,
        lastFourDigits: input.lastFourDigits,
        creditLimit: input.creditLimit,
        closingDay: input.closingDay,
        dueDay: input.dueDay,
      },
    });
    return toCard(record);
  }

  async update(id: string, userId: string, input: UpdateCardInput): Promise<CardRecord | null> {
    const existing = await this.db.card.findFirst({ where: { id, userId } });
    if (!existing) {
      return null;
    }

    const record = await this.db.card.update({
      where: { id },
      data: input,
    });
    return toCard(record);
  }

  async belongsToUser(cardId: string, userId: string): Promise<boolean> {
    const card = await this.db.card.findFirst({
      where: { id: cardId, userId, isActive: true },
      select: { id: true },
    });
    return card !== null;
  }

  async findByLastFourDigits(
    userId: string,
    lastFourDigits: string,
    institutionName?: string | null,
  ): Promise<CardRecord | null> {
    const cards = await this.db.card.findMany({
      where: { userId, isActive: true, lastFourDigits },
    });

    if (cards.length === 0) {
      return null;
    }

    if (!institutionName) {
      return toCard(cards[0]);
    }

    const normalized = normalizeText(institutionName);
    const match = cards.find((card) => {
      const institution = card.institutionName ? normalizeText(card.institutionName) : "";
      const name = normalizeText(card.name);
      return institution.includes(normalized) || normalized.includes(institution) || name.includes(normalized);
    });

    return match ? toCard(match) : toCard(cards[0]);
  }
}

export class PrismaInstrumentLookupService implements InstrumentLookupPort {
  constructor(
    private readonly accountRepository: FinancialAccountRepositoryPort,
    private readonly paymentMethodRepository: PaymentMethodRepositoryPort,
    private readonly cardRepository: CardRepositoryPort,
  ) {}

  async resolve(input: InstrumentLookupInput): Promise<InstrumentLookupResult> {
    const result: InstrumentLookupResult = {};

    if (input.cardLastFourDigits) {
      const card = await this.cardRepository.findByLastFourDigits(
        input.userId,
        input.cardLastFourDigits,
        input.financialInstitution,
      );

      if (card) {
        result.cardId = card.id;
        if (card.financialAccountId) {
          result.financialAccountId = card.financialAccountId;
        }
      }
    }

    if (!result.financialAccountId && input.financialInstitution) {
      const account = await this.accountRepository.findByInstitution(
        input.userId,
        input.financialInstitution,
      );

      if (account) {
        result.financialAccountId = account.id;
      }
    }

    const mappedType = mapExtractedPaymentMethodType(input.paymentMethodType);
    if (mappedType) {
      const method = await this.paymentMethodRepository.findByType(input.userId, mappedType);
      if (method) {
        result.paymentMethodId = method.id;
      }
    }

    return result;
  }
}
