import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { normalizeCategoryName } from "@/lib/categories/category-name-normalizer";
import { seedDefaultUserRulesForUser } from "../seed-default-user-rules";
import { buildDefaultRuleDrafts } from "../default-categorization-rules";

function createMockPrisma() {
  const rules: Array<Record<string, unknown>> = [];
  const subcategories = [...new Set(buildDefaultRuleDrafts().map((d) => String(d.action.value)))];
  const categories = subcategories.map((name, index) => ({
    id: `cat-${index}`,
    name,
    parentCategoryId: null,
    isActive: true,
  }));

  return {
    rules,
    prisma: {
      userRule: {
        findMany: vi.fn(async () => rules.map((r) => ({ ...r }))),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          rules.push({ ...data, id: `rule-${rules.length + 1}` });
          return rules[rules.length - 1];
        }),
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
      category: {
        findMany: vi.fn(async () => categories),
      },
    } as unknown as PrismaClient,
  };
}

describe("seedDefaultUserRulesForUser", () => {
  it("é idempotente — segunda execução não duplica regras", async () => {
    const { prisma, rules } = createMockPrisma();
    const userId = "user-seed";
    const expectedCount = buildDefaultRuleDrafts().length;

    const first = await seedDefaultUserRulesForUser(prisma, userId, { ensureTaxonomy: false });
    const second = await seedDefaultUserRulesForUser(prisma, userId, { ensureTaxonomy: false });

    expect(first.rulesCreated).toBe(expectedCount);
    expect(rules).toHaveLength(expectedCount);
    expect(second.rulesCreated).toBe(0);
    expect(second.rulesSkippedExisting).toBe(expectedCount);
  });

  it("resolve categorias pelo nome normalizado", () => {
    const draft = buildDefaultRuleDrafts()[0];
    expect(normalizeCategoryName(String(draft.action.value))).toBeTruthy();
  });
});
