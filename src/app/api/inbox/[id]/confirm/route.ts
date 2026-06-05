import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConfirmAndCreateTransactionUseCase } from "@/modules/financial-inbox/application/use-cases/confirm-and-create-transaction.use-case";
import { ConfirmTransactionError } from "@/modules/financial-inbox/application/errors/confirm-transaction.error";
import { PrismaExtractionResultRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-extraction-result.repository";
import { PrismaInboxRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-inbox.repository";
import { PrismaUserLearningPatternRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-user-learning-pattern.repository";
import {
  PrismaCardOwnershipRepository,
  PrismaCategoryRepository,
  PrismaFinancialAccountRepository,
  PrismaPaymentMethodRepository,
} from "@/modules/transactions/infrastructure/repositories/prisma-ownership.repositories";
import { PrismaTransactionRepository } from "@/modules/transactions/infrastructure/repositories/prisma-transaction.repository";

const confirmBodySchema = z
  .object({
    accountId: z.string().min(1).optional(),
    type: z.enum(["EXPENSE", "INCOME", "TRANSFER", "UNKNOWN"]).optional(),
    amount: z.number().positive().optional(),
    description: z.string().min(1).optional(),
    categoryId: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
      .optional(),
    paymentMethodId: z.string().min(1).optional(),
    paymentMethod: z.string().min(1).optional(),
    cardId: z.string().min(1).optional(),
    installments: z.number().int().min(1).optional(),
    installmentGroup: z.string().min(1).optional(),
    currentInstallment: z.number().int().positive().optional(),
    totalInstallments: z.number().int().positive().optional(),
  })
  .refine(
    (data) =>
      data.currentInstallment === undefined ||
      data.totalInstallments === undefined ||
      data.currentInstallment <= data.totalInstallments,
    { message: "currentInstallment cannot exceed totalInstallments" },
  );

interface RouteContext {
  params: Promise<{ id: string }>;
}

function mapErrorToResponse(error: ConfirmTransactionError) {
  switch (error.code) {
    case "NOT_FOUND":
      return NextResponse.json({ error: error.message }, { status: 404 });
    case "INVALID_STATE":
      return NextResponse.json({ error: error.message }, { status: 409 });
    case "VALIDATION":
      return NextResponse.json({ error: error.message }, { status: 400 });
    case "DUPLICATE":
      return NextResponse.json({ error: error.message }, { status: 409 });
    default:
      return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: inboxItemId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = confirmBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const useCase = new ConfirmAndCreateTransactionUseCase(
    new PrismaInboxRepository(prisma),
    new PrismaExtractionResultRepository(prisma),
    new PrismaTransactionRepository(prisma),
    new PrismaFinancialAccountRepository(prisma),
    new PrismaCategoryRepository(prisma),
    new PrismaPaymentMethodRepository(prisma),
    new PrismaCardOwnershipRepository(prisma),
    new PrismaUserLearningPatternRepository(prisma),
  );

  try {
    const result = await useCase.execute({
      inboxItemId,
      userId: session.user.id,
      corrections: parsed.data,
    });

    return NextResponse.json(
      {
        inboxItemId: result.inboxItemId,
        status: result.status,
        transaction: result.transaction,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ConfirmTransactionError) {
      return mapErrorToResponse(error);
    }

    console.error("[inbox/confirm]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
