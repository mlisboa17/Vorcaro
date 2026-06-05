import type { PrismaClient } from "@prisma/client";
import {
  parseLearningOutputSignal,
  parseRuleAction,
} from "@/modules/financial-inbox/domain/schemas/user-rule.schema";
import type { CategoryAuditReport } from "../../domain/types/category-audit";
import {
  analyzeCategoryTaxonomy,
  type AuditContext,
} from "../../domain/services/category-audit-detection";

/**
 * Auditoria read-only da taxonomia de categorias.
 * Proibido: excluir, renomear, fundir categorias ou alterar transações/regras automaticamente.
 */
export class CategoryTaxonomyAuditService {
  constructor(private readonly prisma: PrismaClient) {}

  async audit(userId: string): Promise<CategoryAuditReport> {
    const [categories, rules, patterns, transactionGroups] = await Promise.all([
      this.prisma.category.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          parentCategoryId: true,
          isActive: true,
          isSystem: true,
        },
        orderBy: { name: "asc" },
      }),
      this.prisma.userRule.findMany({
        where: { userId, isActive: true },
        select: { action: true },
      }),
      this.prisma.userLearningPattern.findMany({
        where: { userId },
        select: { outputSignal: true },
      }),
      this.prisma.transaction.groupBy({
        by: ["categoryId"],
        where: { userId, categoryId: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const transactionCountByCategoryId: Record<string, number> = {};
    for (const row of transactionGroups) {
      if (row.categoryId) {
        transactionCountByCategoryId[row.categoryId] = row._count._all;
      }
    }

    const ruleCategoryNames: string[] = [];
    for (const rule of rules) {
      const action = parseRuleAction(rule.action);
      if (action?.set === "category" && typeof action.value === "string") {
        ruleCategoryNames.push(action.value);
      }
    }

    const patternCategories: string[] = [];
    for (const pattern of patterns) {
      const output = parseLearningOutputSignal(pattern.outputSignal);
      if (output?.category) {
        patternCategories.push(output.category);
      }
    }

    const ctx: AuditContext = {
      categories,
      ruleCategoryNames,
      patternCategories,
      transactionCountByCategoryId,
    };

    return analyzeCategoryTaxonomy(ctx);
  }
}
