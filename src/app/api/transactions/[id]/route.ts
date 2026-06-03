import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateTransactionBodySchema } from "@/lib/api/transaction-body-schema";
import { parseAllocationsInput } from "@/lib/financial/liability-payment-metadata";
import { prisma } from "@/lib/prisma";
import { PrismaPatrimonyLiabilityRepository } from "@/modules/patrimony/infrastructure/repositories/prisma-patrimony.repositories";
import { UpdateTransactionError } from "@/modules/transactions/application/errors/update-transaction.error";
import { ReverseTransactionError } from "@/modules/transactions/application/use-cases/reverse-transaction.use-case";
import { ReverseTransactionUseCase } from "@/modules/transactions/application/use-cases/reverse-transaction.use-case";
import { UpdateTransactionUseCase } from "@/modules/transactions/application/use-cases/update-transaction.use-case";
import {
  PrismaCardOwnershipRepository,
  PrismaCategoryRepository,
  PrismaFinancialAccountRepository,
  PrismaPaymentMethodRepository,
} from "@/modules/transactions/infrastructure/repositories/prisma-ownership.repositories";
import { PrismaTransactionRepository } from "@/modules/transactions/infrastructure/repositories/prisma-transaction.repository";
import type { TransactionListItem } from "@/types/transactions";
import type { TransactionAllocation } from "@/lib/financial/liability-payment-metadata";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function extractAllocations(metadata: unknown): TransactionAllocation[] | undefined {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  return parseAllocationsInput((metadata as Record<string, unknown>).allocations);
}

function serializeItem(record: {
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
    id: record.id,
    type: record.type,
    amount: record.amount,
    description: record.description,
    date: record.date.toISOString(),
    dataCaixa: record.dataCaixa?.toISOString() ?? null,
    dataCompra: record.dataCompra?.toISOString() ?? null,
    inboxItemId: record.inboxItemId,
    accountId: record.accountId,
    categoryId: record.categoryId,
    paymentMethodId: record.paymentMethodId,
    cardId: record.cardId,
    liabilityId: record.liabilityId,
    allocations: extractAllocations(record.metadata),
    metadata: record.metadata,
    installments: record.installments,
    currentInstallment: record.currentInstallment,
    totalInstallments: record.totalInstallments,
    account: record.account,
    category: record.category,
    paymentMethod: record.paymentMethod,
    card: record.card,
    createdAt: record.createdAt.toISOString(),
  };
}

function mapUpdateError(error: UpdateTransactionError) {
  switch (error.code) {
    case "NOT_FOUND":
      return NextResponse.json({ error: error.message }, { status: 404 });
    case "FORBIDDEN":
      return NextResponse.json({ error: error.message }, { status: 403 });
    case "VALIDATION":
      return NextResponse.json({ error: error.message }, { status: 400 });
    default:
      return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

function buildUpdateUseCase() {
  const repository = new PrismaTransactionRepository(prisma);
  const liabilityRepository = new PrismaPatrimonyLiabilityRepository(prisma);

  return new UpdateTransactionUseCase(
    repository,
    new PrismaFinancialAccountRepository(prisma),
    new PrismaCategoryRepository(prisma),
    new PrismaPaymentMethodRepository(prisma),
    new PrismaCardOwnershipRepository(prisma),
    liabilityRepository,
  );
}

async function handleUpdate(request: Request, id: string, userId: string) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateTransactionBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const updated = await buildUpdateUseCase().execute({
      transactionId: id,
      userId,
      descricao: parsed.data.descricao,
      valor: parsed.data.valor,
      tipo: parsed.data.tipo,
      data: parsed.data.data,
      categoriaId: parsed.data.categoriaId,
      contaFinanceiraId: parsed.data.contaFinanceiraId,
      metodoPagamentoId: parsed.data.metodoPagamentoId,
      cartaoId: parsed.data.cartaoId,
      parcelas: parsed.data.parcelas,
      liabilityId: parsed.data.liabilityId,
      allocations: parseAllocationsInput(parsed.data.allocations),
    });

    return NextResponse.json(serializeItem(updated));
  } catch (error) {
    if (error instanceof UpdateTransactionError) {
      return mapUpdateError(error);
    }

    console.error("[transactions/PATCH|PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  return handleUpdate(request, id, session.user.id);
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  return handleUpdate(request, id, session.user.id);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const repository = new PrismaTransactionRepository(prisma);
  const useCase = new ReverseTransactionUseCase(
    repository,
    prisma,
    new PrismaPatrimonyLiabilityRepository(prisma),
  );

  try {
    const result = await useCase.execute({
      transactionId: id,
      userId: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReverseTransactionError) {
      const status =
        error.code === "NOT_FOUND" ? 404 : error.code === "VALIDATION" ? 400 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }

    console.error("[transactions/DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
