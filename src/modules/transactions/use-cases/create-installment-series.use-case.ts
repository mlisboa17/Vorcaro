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

/**
 * Calcula a data de vencimento da fatura para uma parcela, dado o cartão e a data de compra.
 *
 * Regra: cada parcela cai no dueDay do cartão. O mês da primeira fatura depende
 * de se a compra ocorreu antes ou após o closingDay:
 *   - compra <= closingDay → fatura no mesmo mês
 *   - compra > closingDay  → fatura no próximo mês
 * Parcelas subsequentes avançam mês a mês.
 */
function calcInstallmentDueDate(
  purchaseDate: Date,
  installmentIndex: number, // 1-based
  dueDay: number,
  closingDay: number,
): Date {
  const purchaseDay = purchaseDate.getDate();
  const baseMonth =
    purchaseDay <= closingDay
      ? purchaseDate.getMonth()
      : purchaseDate.getMonth() + 1;
  const targetMonth = baseMonth + (installmentIndex - 1);

  const year = purchaseDate.getFullYear() + Math.floor(targetMonth / 12);
  const month = targetMonth % 12;

  // Garante que o dia existe no mês (ex: dueDay=31 em fevereiro → último dia)
  const maxDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(dueDay, maxDay));
}

export class CreateInstallmentSeriesUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: CreateInstallmentSeriesInput) {
    if (input.totalInstallments <= 1) {
      throw new Error("O número de parcelas deve ser maior que 1 para gerar uma série.");
    }

    // Busca dueDay e closingDay do cartão, se houver
    let dueDay: number | null = null;
    let closingDay: number | null = null;
    if (input.cardId) {
      const card = await this.prisma.card.findUnique({
        where: { id: input.cardId },
        select: { dueDay: true, closingDay: true },
      });
      dueDay = card?.dueDay ?? null;
      closingDay = card?.closingDay ?? null;
    }

    const useCardDates = dueDay !== null && closingDay !== null;

    // Divisão correta de centavos
    const totalDecimal = new Prisma.Decimal(input.totalAmount);
    const splitAmount = totalDecimal.dividedBy(input.totalInstallments).toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
    const remainder = totalDecimal.minus(splitAmount.times(input.totalInstallments));
    const firstInstallmentAmount = splitAmount.plus(remainder);

    const padTotal = input.totalInstallments.toString().padStart(2, "0");

    const firstDate = useCardDates
      ? calcInstallmentDueDate(input.baseDate, 1, dueDay!, closingDay!)
      : input.baseDate;

    // Persiste a primeira parcela (pai)
    const firstTransaction = await this.prisma.transaction.create({
      data: {
        userId: input.userId,
        accountId: input.accountId,
        categoryId: input.categoryId,
        paymentMethodId: input.paymentMethodId,
        cardId: input.cardId,
        type: input.type,
        amount: firstInstallmentAmount.toNumber(),
        description: `${input.description} (01/${padTotal})`,
        date: firstDate,
        dataCompra: input.baseDate,
        dataVencimentoFatura: useCardDates ? firstDate : undefined,
        dataCaixa: input.dataCaixa ?? input.baseDate,
        numeroParcela: 1,
        totalParcelas: input.totalInstallments,
        installments: input.totalInstallments,
        providerEventId: `${input.providerEventId}_P1`,
        fitId: input.fitId ? `${input.fitId}_P1` : undefined,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });

    // Gera parcelas subsequentes
    const childTransactions: Prisma.TransactionCreateManyInput[] = [];

    for (let i = 2; i <= input.totalInstallments; i++) {
      const installmentDate = useCardDates
        ? calcInstallmentDueDate(input.baseDate, i, dueDay!, closingDay!)
        : new Date(input.baseDate.getTime() + 30 * (i - 1) * 86400000);

      const padCurrent = i.toString().padStart(2, "0");

      const childPayload = {
        userId: input.userId,
        accountId: input.accountId,
        categoryId: input.categoryId,
        paymentMethodId: input.paymentMethodId,
        cardId: input.cardId,
        type: input.type,
        amount: splitAmount.toNumber(),
        description: `${input.description} (${padCurrent}/${padTotal})`,
        date: installmentDate,
        dataCompra: input.baseDate,
        dataVencimentoFatura: useCardDates ? installmentDate : undefined,
        dataCaixa: null,
        numeroParcela: i,
        totalParcelas: input.totalInstallments,
        installments: input.totalInstallments,
        providerEventId: `${input.providerEventId}_P${i}`,
        fitId: input.fitId ? `${input.fitId}_P${i}` : undefined,
        metadata: input.metadata ?? Prisma.JsonNull,
        // @ts-ignore — aguardando atualização do PrismaClient local
        parentInstallmentId: firstTransaction.id,
      } as Prisma.TransactionCreateManyInput;

      childTransactions.push(childPayload);
    }

    if (childTransactions.length > 0) {
      await this.prisma.transaction.createMany({
        data: childTransactions,
        skipDuplicates: true,
      });
    }

    return firstTransaction;
  }
}
