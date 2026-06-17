"use server";

import { getTenantPrisma } from "@/lib/prisma-tenant";
import type { Prisma } from "@prisma/client";
import { TransactionListItemData } from "../components/transaction-list-table";

const PAGE_SIZE = 50;

export type GetTransactionsParams = {
  userId: string;
  page: number;
  accountId?: string;
  categoryId?: string;
  search?: string;
  reviewRequired?: string;
};

export async function getTransactions(params: GetTransactionsParams) {
  const { userId, page, accountId, categoryId, search, reviewRequired } = params;
  const prisma = getTenantPrisma(userId);

  const skip = (page - 1) * PAGE_SIZE;

  // 1. Isolamento Multitenant e Query Param ReviewRequired
  const where: Prisma.TransactionWhereInput = {
    userId,
    ...(accountId && { accountId }),
    ...(categoryId && { categoryId }),
    ...(search && {
      description: {
        contains: search,
        mode: "insensitive",
      },
    }),
    ...(reviewRequired === "true" && {
      metadata: {
        path: ['reviewRequired'],
        equals: true,
      }
    }),
  };

  const [totalCount, rawTransactions, accounts, categories, incomeAgg, expenseAgg] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      take: PAGE_SIZE, // Mantendo paginação estrita
      skip,
      orderBy: { date: "desc" },
      include: {
        account: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.financialAccount.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.aggregate({
      where: { ...where, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...where, amount: { lt: 0 } },
      _sum: { amount: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const income = Number(incomeAgg._sum.amount ?? 0);
  const expense = Number(expenseAgg._sum.amount ?? 0);
  const balance = income + expense;

  const transactions: TransactionListItemData[] = rawTransactions.map((tx) => {
    const meta = tx.metadata as Record<string, any> | null;
    return {
      id: tx.id,
      description: tx.description,
      amount: Number(tx.amount),
      type: tx.type,
      date: tx.date,
      paymentDate: tx.dataCaixa ?? undefined,
      accountName: tx.account?.name ?? null,
      categoryName: tx.category?.name ?? null,
      reviewRequired: meta?.reviewRequired === true, // 2. Indicação de Badge
      mediaUrl: meta?.mediaUrl ?? undefined,
    };
  });

  return {
    transactions,
    totalCount,
    totalPages,
    accounts,
    categories,
    income,
    expense,
    balance
  };
}
