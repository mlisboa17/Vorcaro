import type { PrismaClient } from "@prisma/client";
import { buildInboxClassificationCategoryContext } from "@/lib/categories/inbox-classification-category-context";
import { ListRulesAndPatternsUseCase } from "@/modules/financial-inbox/application/use-cases/manage-rules.use-case";
import { PrismaUserLearningPatternRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-user-learning-pattern.repository";
import { PrismaUserRuleRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-user-rule.repository";
import type { VorcaroToolResult } from "../../domain/types/vorcaro-intent";

function formatCondition(condition: { field: string; operator: string; value: string }): string {
  return `${condition.field} ${condition.operator} "${condition.value}"`;
}

function formatAction(action: { set: string; value: string | number }): string {
  return `${action.set} = ${action.value}`;
}

export class RulesAutomationTool {
  private readonly listRules: ListRulesAndPatternsUseCase;

  constructor(private readonly prisma: PrismaClient) {
    this.listRules = new ListRulesAndPatternsUseCase(
      new PrismaUserRuleRepository(prisma),
      new PrismaUserLearningPatternRepository(prisma),
    );
  }

  async execute(userId: string, question: string): Promise<VorcaroToolResult> {
    const [{ rules, patterns }, categories] = await Promise.all([
      this.listRules.execute({ userId }),
      this.prisma.category.findMany({
        where: { userId },
        select: { id: true, name: true, parentCategoryId: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const activeRules = rules.filter((r) => r.isActive);
    const inactiveRules = rules.filter((r) => !r.isActive);
    const taxonomyPreview = buildInboxClassificationCategoryContext(categories).split("\n").slice(0, 12);

    const facts: string[] = [
      `${activeRules.length} regra(s) ativa(s) e ${inactiveRules.length} inativa(s).`,
      `${patterns.length} padrão(ões) aprendido(s) pela IA.`,
    ];

    if (activeRules.length > 0) {
      facts.push(
        ...activeRules.slice(0, 5).map(
          (r) => `Regra "${r.name}": SE ${formatCondition(r.condition)} ENTÃO ${formatAction(r.action)}`,
        ),
      );
    }

    if (patterns.length > 0) {
      facts.push(
        ...patterns.slice(0, 5).map(
          (p) =>
            `Padrão "${p.inputSignal.keyword}" → ${p.outputSignal.category ?? "categoria"} (${p.occurrences}x)`,
        ),
      );
    }

    facts.push(...taxonomyPreview.map((l) => (l.startsWith("-") ? `Taxonomia: ${l}` : l)));

    const recommendations: string[] = [
      "Alterações em regras exigem confirmação manual no painel de regras.",
    ];

    if (/classific/i.test(question)) {
      recommendations.push(
        "Classificações seguem ordem: regras do usuário → padrões aprendidos → heurísticas → IA (quando necessário).",
      );
    }

    if (activeRules.length === 0 && patterns.length === 0) {
      recommendations.push(
        "Considere criar regras para merchants recorrentes e revisar classificações no inbox.",
      );
    } else if (patterns.length >= 3) {
      recommendations.push("Revise padrões aprendidos periodicamente para evitar categorização incorreta.");
    }

    return {
      intent: "RULES_AUTOMATIONS",
      title: "Regras e automações",
      summary: `Você possui ${activeRules.length} regra(s) ativa(s) e ${patterns.length} padrão(ões) aprendido(s). Nenhuma alteração é feita automaticamente pelo Vorcaro.`,
      facts,
      metrics: {
        activeRules: activeRules.length,
        inactiveRules: inactiveRules.length,
        learnedPatterns: patterns.length,
        categoryCount: categories.length,
      },
      recommendations,
    };
  }
}
