import type { PrismaClient } from "@prisma/client";
import { normalizeCategoryName } from "@/lib/categories/category-name-normalizer";
import { seedCategoryTaxonomyForUser } from "@/lib/categories/seed-category-taxonomy";
import {
  buildDefaultRuleDrafts,
  DEPRECATED_MOBILITY_KEYWORDS,
  isSystemDefaultRuleDescription,
  SYSTEM_DEFAULT_RULE_DESCRIPTION,
  ruleFingerprint,
} from "./default-categorization-rules";
import { parseRuleAction, parseRuleCondition } from "@/modules/financial-inbox/domain/schemas/user-rule.schema";

export type SeedDefaultUserRulesReport = {
  userId: string;
  taxonomyApplied: boolean;
  rulesCreated: number;
  rulesSkippedExisting: number;
  rulesSkippedMissingCategory: number;
  rulesRemovedDeprecated: number;
  pendingCategories: string[];
};

async function removeDeprecatedSystemMobilityRules(
  prisma: PrismaClient,
  userId: string,
): Promise<number> {
  const prefix = `${SYSTEM_DEFAULT_RULE_DESCRIPTION}:mobility:`;
  const deprecated = await prisma.userRule.findMany({
    where: {
      userId,
      description: { startsWith: prefix },
    },
    select: { id: true, description: true },
  });

  const toDelete = deprecated.filter((r) => {
    const keyword = r.description?.slice(prefix.length) ?? "";
    return (DEPRECATED_MOBILITY_KEYWORDS as readonly string[]).includes(keyword);
  });

  if (toDelete.length === 0) return 0;

  await prisma.userRule.deleteMany({
    where: { id: { in: toDelete.map((r) => r.id) } },
  });

  return toDelete.length;
}

export async function seedDefaultUserRulesForUser(
  prisma: PrismaClient,
  userId: string,
  options?: { ensureTaxonomy?: boolean },
): Promise<SeedDefaultUserRulesReport> {
  const ensureTaxonomy = options?.ensureTaxonomy ?? true;

  if (ensureTaxonomy) {
    await seedCategoryTaxonomyForUser(prisma, userId);
  }

  const rulesRemovedDeprecated = await removeDeprecatedSystemMobilityRules(prisma, userId);

  const categories = await prisma.category.findMany({
    where: { userId, isActive: true },
    select: { id: true, name: true, parentCategoryId: true },
  });

  const categoryByNorm = new Map(
    categories.map((c) => [normalizeCategoryName(c.name), c]),
  );

  const existingRules = await prisma.userRule.findMany({
    where: { userId },
    select: { description: true, condition: true, action: true },
  });

  const existingFingerprints = new Set<string>();
  for (const rule of existingRules) {
    const condition = parseRuleCondition(rule.condition);
    const action = parseRuleAction(rule.action);
    if (condition && action) {
      existingFingerprints.add(ruleFingerprint(condition, action));
    }
  }

  const drafts = buildDefaultRuleDrafts();
  const report: SeedDefaultUserRulesReport = {
    userId,
    taxonomyApplied: ensureTaxonomy,
    rulesCreated: 0,
    rulesSkippedExisting: 0,
    rulesSkippedMissingCategory: 0,
    rulesRemovedDeprecated,
    pendingCategories: [],
  };

  const pendingSet = new Set<string>();

  for (const draft of drafts) {
    const fp = ruleFingerprint(draft.condition, draft.action);
    if (existingFingerprints.has(fp)) {
      report.rulesSkippedExisting += 1;
      continue;
    }

    const normSub = normalizeCategoryName(String(draft.action.value));
    const categoryRow = categoryByNorm.get(normSub);

    if (!categoryRow) {
      report.rulesSkippedMissingCategory += 1;
      pendingSet.add(String(draft.action.value));
      continue;
    }

    await prisma.userRule.create({
      data: {
        userId,
        name: draft.name,
        description: draft.description,
        condition: draft.condition,
        action: draft.action,
        priority: draft.priority,
        isActive: true,
      },
    });

    existingFingerprints.add(fp);
    report.rulesCreated += 1;
  }

  report.pendingCategories = [...pendingSet].sort();
  return report;
}

export function formatSeedDefaultUserRulesReport(report: SeedDefaultUserRulesReport): string {
  const lines = [
    `Usuário: ${report.userId}`,
    `Taxonomia aplicada: ${report.taxonomyApplied ? "sim" : "não"}`,
    `Regras criadas: ${report.rulesCreated}`,
    `Regras já existentes (ignoradas): ${report.rulesSkippedExisting}`,
    `Regras obsoletas removidas: ${report.rulesRemovedDeprecated}`,
    `Regras sem categoria (pendentes): ${report.rulesSkippedMissingCategory}`,
  ];

  if (report.pendingCategories.length > 0) {
    lines.push(`Categorias pendentes: ${report.pendingCategories.join(", ")}`);
  }

  return lines.join("\n");
}

export async function countSystemDefaultRules(
  prisma: PrismaClient,
  userId: string,
): Promise<number> {
  const rules = await prisma.userRule.findMany({
    where: { userId },
    select: { description: true },
  });
  return rules.filter((r) => isSystemDefaultRuleDescription(r.description)).length;
}
