import { PrismaClient, TransactionType, Prisma } from "@prisma/client";

export interface CreateInstallmentSeriesInput {
  userId: string;
  accountId?: string;
  categoryId?: string;
  paymentMethodId?: string;
  cardId?: string;
  type: TransactionType;
  totalAmount: number;
  description: string;
  baseDate: Date;
  totalInstallments: number;
  providerEventId: string;
  metadata?: Prisma.InputJsonValue;
  dataCaixa?: Date | null;
  fitId?: string;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export class CreateInstallmentSeriesUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: CreateInstallmentSeriesInput) {
    if (input.totalInstallments <= 1) {
      throw new Error("O número de parcelas deve ser maior que 1 para gerar uma série.");
    }

    // 1. Cálculo Atômico de Dízimas e Centavos usando Prisma.Decimal
    const totalDecimal = new Prisma.Decimal(input.totalAmount);
    const splitAmount = totalDecimal.dividedBy(input.totalInstallments).toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
    const totalSplit = splitAmount.times(input.totalInstallments);
    const remainder = totalDecimal.minus(totalSplit);

    // Injeta a sobra de centavos na primeira parcela
    const firstInstallmentAmount = splitAmount.plus(remainder);

    // Formatação segura (ex: 01/03, 02/03)
    const padTotal = input.totalInstallments.toString().padStart(2, "0");

    // 2. Persistir a Primeira Parcela (Pai)
    const firstTransaction = await this.prisma.transaction.create({
      data: {
        userId: input.userId, // Isolamento Multitenant Inegociável
        accountId: input.accountId,
        categoryId: input.categoryId,
        paymentMethodId: input.paymentMethodId,
        cardId: input.cardId,
        type: input.type,
        amount: firstInstallmentAmount.toNumber(),
        description: `${input.description} (01/${padTotal})`,
        date: input.baseDate,
        dataCompra: input.baseDate,
        dataCaixa: input.dataCaixa ?? input.baseDate,
        numeroParcela: 1,
        totalParcelas: input.totalInstallments,
        installments: input.totalInstallments,
        providerEventId: `${input.providerEventId}_P1`,
        fitId: input.fitId ? `${input.fitId}_P1` : undefined,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });

    // 3. Gerar Parcelas Subsequentes em Memória
    const childTransactions: Prisma.TransactionCreateManyInput[] = [];

    for (let i = 2; i <= input.totalInstallments; i++) {
      const nextDate = addDays(input.baseDate, 30 * (i - 1));
      const padCurrent = i.toString().padStart(2, "0");

      const childPayload = {
        userId: input.userId, // Isolamento Multitenant Inegociável
        accountId: input.accountId,
        categoryId: input.categoryId,
        paymentMethodId: input.paymentMethodId,
        cardId: input.cardId,
        type: input.type,
        amount: splitAmount.toNumber(),
        description: `${input.description} (${padCurrent}/${padTotal})`,
        date: nextDate,
        dataCompra: input.baseDate,
        dataCaixa: null, // ESTRITAMENTE PENDING
        numeroParcela: i,
        totalParcelas: input.totalInstallments,
        installments: input.totalInstallments,
        providerEventId: `${input.providerEventId}_P${i}`,
        fitId: input.fitId ? `${input.fitId}_P${i}` : undefined,
        metadata: input.metadata ?? Prisma.JsonNull,
      } as Prisma.TransactionCreateManyInput;

      // Adicionando via casting manual provisório até o PrismaClient atualizar localmente na máquina do dev
      // @ts-ignore
      childPayload.parentInstallmentId = firstTransaction.id;

      childTransactions.push(childPayload);
    }

    // 4. Inserção Atômica Baseada em Banco
    if (childTransactions.length > 0) {
      await this.prisma.transaction.createMany({
        data: childTransactions,
        skipDuplicates: true, // Idempotência via providerEventId garantida
      });
    }

    return firstTransaction;
  }
}
