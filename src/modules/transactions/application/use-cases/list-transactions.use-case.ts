import type { PrismaClient, TransactionType } from "@prisma/client";
import { resolvePeriodPreset } from "@/lib/utils/date-periods";
import type { TransactionSummary } from "@/types/transactions";
import type {
  ListTransactionsFilters,
  TransactionRepositoryPort,
  TransactionWithRelations,
} from "../../domain/ports/transaction-repository.port";

const MAIN_ACCOUNT_NAME = "Conta Corrente Principal";

export interface ListTransactionsInput {
  userId: string;
  accountId?: string;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  period?: "current_month" | "previous_month";
  limit?: number;
  offset?: number;
}

export interface ListTransactionsOutput {
  items: TransactionWithRelations[];
  total: number;
  summary: TransactionSummary;
}

export class ListTransactionsUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepositoryPort,
    private readonly db: PrismaClient,
  ) {}

  async execute(input: ListTransactionsInput): Promise<ListTransactionsOutput> {
    const period = resolvePeriodPreset(input.period ?? "current_month");
    const startDate = input.startDate ?? period.startDate;
    const endDate = input.endDate ?? period.endDate;

    const filters: ListTransactionsFilters = {
      accountId: input.accountId,
      categoryId: input.categoryId,
      startDate,
      endDate,
      limit: input.limit,
      offset: input.offset,
    };

    const [{ items, total }, mainAccount, periodTotals, mainAccountBalance] = await Promise.all([
      this.transactionRepository.listByUserId(input.userId, filters),
      this.resolveMainAccount(input.userId),
      this.aggregatePeriodTotals(input.userId, {
        accountId: input.accountId,
        categoryId: input.categoryId,
        startDate,
        endDate,
      }),
      this.computeMainAccountBalance(input.userId),
    ]);

    return {
      items,
      total,
      summary: {
        mainAccountId: mainAccount?.id ?? null,
        mainAccountName: mainAccount?.name ?? null,
        mainAccountBalance,
        periodIncome: periodTotals.income,
        periodExpense: periodTotals.expense,
        periodLabel: period.label,
      },
    };
  }

  private async resolveMainAccount(userId: string) {
    const named = await this.db.financialAccount.findFirst({
      where: { userId, name: MAIN_ACCOUNT_NAME, isActive: true },
      select: { id: true, name: true },
    });

    if (named) {
      return named;
    }

    return this.db.financialAccount.findFirst({
      where: { userId, isActive: true, type: "CHECKING" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });
  }

  private async computeMainAccountBalance(userId: string): Promise<number> {
    const mainAccount = await this.resolveMainAccount(userId);

    if (!mainAccount) {
      return 0;
    }

    const transactions = await this.db.transaction.findMany({
      where: { userId, accountId: mainAccount.id },
      select: { type: true, amount: true },
    });

    return transactions.reduce((balance, transaction) => {
      return balance + this.signedAmount(transaction.type, transaction.amount.toNumber());
    }, 0);
  }

  private async aggregatePeriodTotals(
    userId: string,
    filters: {
      accountId?: string;
      categoryId?: string;
      startDate: Date;
      endDate: Date;
    },
  ) {
    const transactions = await this.db.transaction.findMany({
      where: {
        userId,
        ...(filters.accountId ? { accountId: filters.accountId } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        date: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      select: { type: true, amount: true },
    });

    return transactions.reduce(
      (totals, transaction) => {
        const amount = transaction.amount.toNumber();

        if (transaction.type === "INCOME") {
          totals.income += amount;
        }

        if (transaction.type === "EXPENSE") {
          totals.expense += amount;
        }

        return totals;
      },
      { income: 0, expense: 0 },
    );
  }

  private signedAmount(type: TransactionType, amount: number): number {
    if (type === "INCOME") {
      return amount;
    }

    if (type === "EXPENSE") {
      return -amount;
    }

    return 0;
  }
}
