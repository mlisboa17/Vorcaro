import type { FrequenciaRecorrencia, PrismaClient } from "@prisma/client";
import { resolvePeriodPreset } from "@/lib/utils/date-periods";
import type { BudgetOverview, BudgetOverviewPort } from "../../domain/ports/budget-overview.port";

const ATTENTION_THRESHOLD = 0.8;

function monthlyEquivalent(valor: number, frequencia: FrequenciaRecorrencia): number {
  switch (frequencia) {
    case "SEMANAL":
      return valor * (52 / 12);
    case "QUINZENAL":
      return valor * 2;
    case "MENSAL":
      return valor;
    case "BIMESTRAL":
      return valor / 2;
    case "TRIMESTRAL":
      return valor / 3;
    case "SEMESTRAL":
      return valor / 6;
    case "ANUAL":
      return valor / 12;
    default:
      return valor;
  }
}

export class BudgetOverviewService implements BudgetOverviewPort {
  constructor(private readonly prisma: PrismaClient) {}

  async getOverview(userId: string, reference = new Date()): Promise<BudgetOverview> {
    const period = resolvePeriodPreset("current_month", reference);
    const { startDate, endDate } = period;

    const [recurring, dreExpenses] = await Promise.all([
      this.prisma.lancamentoRecorrente.findMany({
        where: { userId, estaAtivo: true, tipo: "DESPESA" },
        select: {
          categoryId: true,
          valor: true,
          frequencia: true,
          category: { select: { name: true } },
        },
      }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          type: "EXPENSE",
          date: { gte: startDate, lte: endDate },
          categoryId: { not: null },
        },
        select: { categoryId: true, amount: true },
      }),
    ]);

    const plannedByCategory = new Map<string, { name: string; planejado: number }>();

    for (const item of recurring) {
      const monthly = monthlyEquivalent(item.valor.toNumber(), item.frequencia);
      const existing = plannedByCategory.get(item.categoryId);
      if (existing) {
        existing.planejado += monthly;
      } else {
        plannedByCategory.set(item.categoryId, {
          name: item.category.name,
          planejado: monthly,
        });
      }
    }

    const realizedByCategory = new Map<string, number>();
    for (const tx of dreExpenses) {
      if (!tx.categoryId) continue;
      realizedByCategory.set(
        tx.categoryId,
        (realizedByCategory.get(tx.categoryId) ?? 0) + tx.amount.toNumber(),
      );
    }

    const categoryIds = new Set([...plannedByCategory.keys(), ...realizedByCategory.keys()]);
    const categories = [...categoryIds].map((categoryId) => {
      const planned = plannedByCategory.get(categoryId);
      const planejado = planned?.planejado ?? 0;
      const realizadoDre = realizedByCategory.get(categoryId) ?? 0;
      return {
        categoryId,
        categoryName: planned?.name ?? "Sem categoria",
        planejado,
        realizadoDre,
      };
    });

    let categoriasEstouradas = 0;
    let categoriasAtencao = 0;

    for (const row of categories) {
      if (row.planejado <= 0) continue;
      const ratio = row.realizadoDre / row.planejado;
      if (ratio >= 1) {
        categoriasEstouradas += 1;
      } else if (ratio >= ATTENTION_THRESHOLD) {
        categoriasAtencao += 1;
      }
    }

    const totalPlanejado = categories.reduce((sum, row) => sum + row.planejado, 0);
    const totalRealizadoDre = categories.reduce((sum, row) => sum + row.realizadoDre, 0);
    const restante = totalPlanejado - totalRealizadoDre;

    return {
      totalPlanejado,
      totalRealizadoDre,
      restante,
      categoriasEstouradas,
      categoriasAtencao,
      categories,
    };
  }
}

export function buildBudgetOverviewService(prisma: PrismaClient): BudgetOverviewService {
  return new BudgetOverviewService(prisma);
}
