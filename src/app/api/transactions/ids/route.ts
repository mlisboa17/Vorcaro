import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePeriodPreset } from "@/lib/utils/date-periods";
import { PrismaTransactionRepository } from "@/modules/transactions/infrastructure/repositories/prisma-transaction.repository";

const querySchema = z.object({
  accountId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  period: z.enum(["current_month", "previous_month"]).optional(),
});

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
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const period = resolvePeriodPreset(parsed.data.period ?? "current_month");
  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : period.startDate;
  const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : period.endDate;

  const repository = new PrismaTransactionRepository(prisma);
  const ids = await repository.listIdsByUserId(session.user.id, {
    accountId: parsed.data.accountId,
    categoryId: parsed.data.categoryId,
    startDate,
    endDate,
  });

  return NextResponse.json({ ids, total: ids.length });
}
