import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrismaPatrimonyLiabilityRepository } from "@/modules/patrimony/infrastructure/repositories/prisma-patrimony.repositories";
import { BulkDeleteTransactionsError } from "@/modules/transactions/application/errors/bulk-update-transactions.error";
import { BulkDeleteTransactionsUseCase } from "@/modules/transactions/application/use-cases/bulk-delete-transactions.use-case";
import { bulkDeleteTransactionsApiSchema } from "@/modules/transactions/domain/schemas/bulk-update-transactions-api.schema";
import { PrismaTransactionRepository } from "@/modules/transactions/infrastructure/repositories/prisma-transaction.repository";

function mapError(error: BulkDeleteTransactionsError) {
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

  const parsed = bulkDeleteTransactionsApiSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const repository = new PrismaTransactionRepository(prisma);
  const useCase = new BulkDeleteTransactionsUseCase(
    repository,
    prisma,
    new PrismaPatrimonyLiabilityRepository(prisma),
  );

  try {
    const result = await useCase.execute({
      userId: session.user.id,
      transactionIds: parsed.data.transactionIds,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BulkDeleteTransactionsError) {
      return mapError(error);
    }

    console.error("[transactions/bulk-delete]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
