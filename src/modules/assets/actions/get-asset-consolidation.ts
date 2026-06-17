"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrismaPatrimonyUnitOfWork } from "@/modules/patrimony/infrastructure/repositories/prisma-patrimony-unit-of-work";

export type AssetConsolidationResult = {
  patrimonioLiquido: number;
  variationPercent: number;
};

export async function getAssetConsolidation(): Promise<AssetConsolidationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Não autorizado");
  }

  const userId = session.user.id;
  const unitOfWork = new PrismaPatrimonyUnitOfWork(prisma);
  const summary = await unitOfWork.getSummary(userId);

  const currentMonthIndex = new Date().getMonth();
  const currentMonthData = summary.evolucaoMensal[currentMonthIndex];
  const prevMonthData = currentMonthIndex > 0 ? summary.evolucaoMensal[currentMonthIndex - 1] : null;

  let variationPercent = 0;
  if (prevMonthData && prevMonthData.patrimonioLiquido > 0) {
    variationPercent = ((currentMonthData.patrimonioLiquido - prevMonthData.patrimonioLiquido) / prevMonthData.patrimonioLiquido) * 100;
  } else if (prevMonthData && prevMonthData.patrimonioLiquido === 0 && currentMonthData.patrimonioLiquido > 0) {
    variationPercent = 100;
  }

  return {
    patrimonioLiquido: summary.patrimonioLiquido,
    variationPercent: Number(variationPercent.toFixed(2)),
  };
}
