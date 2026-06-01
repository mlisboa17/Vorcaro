import { NextResponse } from "next/server";

import { z } from "zod";

import { TransactionType } from "@prisma/client";

import { auth } from "@/lib/auth";

import { prisma } from "@/lib/prisma";

import { UpdateTransactionError } from "@/modules/transactions/application/errors/update-transaction.error";

import { UpdateTransactionUseCase } from "@/modules/transactions/application/use-cases/update-transaction.use-case";

import {

  ReverseTransactionError,

  ReverseTransactionUseCase,

} from "@/modules/transactions/application/use-cases/reverse-transaction.use-case";

import {

  PrismaCardOwnershipRepository,

  PrismaCategoryRepository,

  PrismaFinancialAccountRepository,

  PrismaPaymentMethodRepository,

} from "@/modules/transactions/infrastructure/repositories/prisma-ownership.repositories";

import { PrismaTransactionRepository } from "@/modules/transactions/infrastructure/repositories/prisma-transaction.repository";

import type { TransactionListItem } from "@/types/transactions";



const updateBodySchema = z.object({

  descricao: z.string().min(1),

  valor: z.number().positive(),

  tipo: z.nativeEnum(TransactionType),

  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data must be YYYY-MM-DD"),

  categoriaId: z.string().min(1),

  contaFinanceiraId: z.string().min(1),

  metodoPagamentoId: z.string().min(1),

  cartaoId: z.string().min(1).nullable().optional(),

  parcelas: z.number().int().min(1),

});



interface RouteContext {

  params: Promise<{ id: string }>;

}



function serializeItem(record: {

  id: string;

  type: TransactionListItem["type"];

  amount: number;

  description: string;

  date: Date;

  inboxItemId: string | null;

  accountId: string | null;

  categoryId: string | null;

  paymentMethodId: string | null;

  cardId: string | null;

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

    inboxItemId: record.inboxItemId,

    accountId: record.accountId,

    categoryId: record.categoryId,

    paymentMethodId: record.paymentMethodId,

    cardId: record.cardId,

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



export async function PUT(request: Request, context: RouteContext) {

  const session = await auth();



  if (!session?.user?.id) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  const { id } = await context.params;



  let body: unknown;

  try {

    body = await request.json();

  } catch {

    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  }



  const parsed = updateBodySchema.safeParse(body);

  if (!parsed.success) {

    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  }



  const repository = new PrismaTransactionRepository(prisma);

  const useCase = new UpdateTransactionUseCase(

    repository,

    new PrismaFinancialAccountRepository(prisma),

    new PrismaCategoryRepository(prisma),

    new PrismaPaymentMethodRepository(prisma),

    new PrismaCardOwnershipRepository(prisma),

  );



  try {

    const updated = await useCase.execute({

      transactionId: id,

      userId: session.user.id,

      ...parsed.data,

    });



    return NextResponse.json(serializeItem(updated));

  } catch (error) {

    if (error instanceof UpdateTransactionError) {

      return mapUpdateError(error);

    }



    console.error("[transactions/PUT]", error);

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });

  }

}



export async function DELETE(_request: Request, context: RouteContext) {

  const session = await auth();



  if (!session?.user?.id) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  const { id } = await context.params;



  const repository = new PrismaTransactionRepository(prisma);

  const useCase = new ReverseTransactionUseCase(repository, prisma);



  try {

    const result = await useCase.execute({

      transactionId: id,

      userId: session.user.id,

    });



    return NextResponse.json(result);

  } catch (error) {

    if (error instanceof ReverseTransactionError) {

      const status = error.code === "NOT_FOUND" ? 404 : 403;

      return NextResponse.json({ error: error.message }, { status });

    }



    console.error("[transactions/DELETE]", error);

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });

  }

}


