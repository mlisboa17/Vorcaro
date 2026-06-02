import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrismaPatrimonyLiabilityRepository } from "@/modules/patrimony/infrastructure/repositories/prisma-patrimony.repositories";
import { BulkUpdateTransactionsError } from "@/modules/transactions/application/errors/bulk-update-transactions.error";
import { BulkUpdateTransactionsUseCase } from "@/modules/transactions/application/use-cases/bulk-update-transactions.use-case";
import { bulkUpdateTransactionsApiSchema } from "@/modules/transactions/domain/schemas/bulk-update-transactions-api.schema";
import {
  PrismaCardOwnershipRepository,
  PrismaCategoryRepository,
  PrismaFinancialAccountRepository,
  PrismaPaymentMethodRepository,
} from "@/modules/transactions/infrastructure/repositories/prisma-ownership.repositories";
import { PrismaTransactionRepository } from "@/modules/transactions/infrastructure/repositories/prisma-transaction.repository";

function mapError(error: BulkUpdateTransactionsError) {
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

function buildUseCase() {
  const repository = new PrismaTransactionRepository(prisma);

  return new BulkUpdateTransactionsUseCase(
    repository,
    new PrismaCategoryRepository(prisma),
    new PrismaFinancialAccountRepository(prisma),
    new PrismaPaymentMethodRepository(prisma),
    new PrismaCardOwnershipRepository(prisma),
    new PrismaPatrimonyLiabilityRepository(prisma),
  );
}

export async function PATCH(request: Request) {
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

  const parsed = bulkUpdateTransactionsApiSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await buildUseCase().execute({
      userId: session.user.id,
      transactionIds: parsed.data.transactionIds,
      updates: parsed.data.updates,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BulkUpdateTransactionsError) {
      return mapError(error);
    }

    console.error("[transactions/bulk-update]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
