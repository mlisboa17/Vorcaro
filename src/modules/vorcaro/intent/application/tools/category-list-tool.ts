import type { PrismaClient } from "@prisma/client";
import type { VorcaroToolResult } from "../../domain/types/vorcaro-intent";

export class CategoryListTool {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(userId: string): Promise<VorcaroToolResult> {
    const categories = await this.prisma.category.findMany({
      where: { userId, isActive: true, parentCategoryId: null },
      select: {
        name: true,
        subcategories: {
          where: { isActive: true },
          select: { name: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const lines: string[] = [];
    for (const root of categories) {
      if (root.subcategories.length > 0) {
        lines.push(`**${root.name}**`);
        for (const sub of root.subcategories) {
          lines.push(`  • ${sub.name}`);
        }
      } else {
        lines.push(`• ${root.name}`);
      }
    }

    const summary =
      categories.length > 0
        ? `Aqui estão suas categorias ativas (${categories.length} categoria${categories.length === 1 ? "" : "s"} raiz):`
        : "Você ainda não possui categorias cadastradas.";

    return {
      intent: "CATEGORY_LIST",
      title: "Suas categorias",
      summary: [summary, "", ...lines].join("\n"),
      facts: [],
      metrics: { rootCount: categories.length },
      recommendations: [],
    };
  }
}
