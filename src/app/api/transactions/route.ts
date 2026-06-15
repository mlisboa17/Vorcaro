import { NextResponse } from "next/server";
import { z } from "zod";
import { TransactionType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateTransactionError } from "@/modules/transactions/application/errors/create-transaction.error";
import { CreateTransactionUseCase } from "@/modules/transactions/application/use-cases/create-transaction.use-case";
import { ListTransactionsUseCase } from "@/modules/transactions/application/use-cases/list-transactions.use-case";
import {
  PrismaCardOwnershipRepository,
  PrismaCategoryRepository,
  PrismaFinancialAccountRepository,
  PrismaPaymentMethodRepository,
} from "@/modules/transactions/infrastructure/repositories/prisma-ownership.repositories";
import { PrismaTransactionRepository } from "@/modules/transactions/infrastructure/repositories/prisma-transaction.repository";
import { PrismaPatrimonyLiabilityRepository } from "@/modules/patrimony/infrastructure/repositories/prisma-patrimony.repositories";
import { createTransactionBodySchema } from "@/lib/api/transaction-body-schema";
import { parseAllocationsInput } from "@/lib/financial/liability-payment-metadata";
import type { TransactionAllocation } from "@/lib/financial/liability-payment-metadata";
import type { TransactionListItem, TransactionListResponse } from "@/types/transactions";

const querySchema = z.object({
  accountId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  period: z.enum(["today", "last_7_days", "current_month", "previous_month", "custom"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

function extractAllocations(metadata: unknown): TransactionAllocation[] | undefined {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  return parseAllocationsInput((metadata as Record<string, unknown>).allocations);
}

function serializeItem(item: {
  id: string;
  type: TransactionListItem["type"];
  amount: number;
  description: string;
  date: Date;
  dataCaixa: Date | null;
  dataCompra: Date | null;
  inboxItemId: string | null;
  accountId: string | null;
  categoryId: string | null;
  paymentMethodId: string | null;
  cardId: string | null;
  liabilityId: string | null;
  metadata: Record<string, unknown> | null;
  installments: number;
  currentInstallment: number | null;
  totalInstallments: number | null;
  createdAt: Date;
  account: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  paymentMethod: { id: string; name: string } | null;
  card: { id: string; name: string } | null;
}): TransactionListItem {
  return {
    id: item.id,
    type: item.type,
    amount: item.amount,
    description: item.description,
    date: item.date.toISOString(),
    dataCaixa: item.dataCaixa?.toISOString() ?? null,
    dataCompra: item.dataCompra?.toISOString() ?? null,
    inboxItemId: item.inboxItemId,
    accountId: item.accountId,
    categoryId: item.categoryId,
    paymentMethodId: item.paymentMethodId,
    cardId: item.cardId,
    liabilityId: item.liabilityId,
    allocations: extractAllocations(item.metadata),
    metadata: item.metadata,
    installments: item.installments,
    currentInstallment: item.currentInstallment,
    totalInstallments: item.totalInstallments,
    account: item.account,
    category: item.category,
    paymentMethod: item.paymentMethod,
    card: item.card,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    accountId: searchParams.get("accountId") ?? undefined,
    categoryId: searchParams.get("categoryId") ?? undefined,
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
    period: searchParams.get("period") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const repository = new PrismaTransactionRepository(prisma);
  const useCase = new ListTransactionsUseCase(repository, prisma);

  const result = await useCase.execute({
    userId: session.user.id,
    accountId: parsed.data.accountId,
    categoryId: parsed.data.categoryId,
    startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
    period: parsed.data.period,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });

  const response: TransactionListResponse = {
    items: result.items.map(serializeItem),
    total: result.total,
    summary: result.summary,
  };

  return NextResponse.json(response);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createTransactionBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const repository = new PrismaTransactionRepository(prisma);
  const useCase = new CreateTransactionUseCase(
    repository,
    new PrismaCategoryRepository(prisma),
    new PrismaFinancialAccountRepository(prisma),
    new PrismaPaymentMethodRepository(prisma),
    new PrismaCardOwnershipRepository(prisma),
    new PrismaPatrimonyLiabilityRepository(prisma),
  );

  try {
    const created = await useCase.execute({
      userId: session.user.id,
      descricao: parsed.data.descricao,
      valor: parsed.data.valor,
      tipo: parsed.data.tipo,
      data: parsed.data.data,
      categoriaId: parsed.data.categoriaId,
      contaFinanceiraId: parsed.data.contaFinanceiraId,
      formaPagamentoId: parsed.data.formaPagamentoId,
      cartaoId: parsed.data.cartaoId,
      parcelas: parsed.data.parcelas,
      liabilityId: parsed.data.liabilityId ?? undefined,
      allocations: parseAllocationsInput(parsed.data.allocations),
    });

    return NextResponse.json(serializeItem(created), { status: 201 });
  } catch (error) {
    if (error instanceof CreateTransactionError) {
      const status = error.code === "VALIDATION" ? 400 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }

    console.error("[transactions/POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
