import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatPatternTargetLabel,
  formatPatternTypeLabel,
  formatRuleActionLabel,
  formatRuleConditionLabel,
} from "@/lib/utils/rule-labels";
import {
  CreateUserRuleUseCase,
  ListRulesAndPatternsUseCase,
} from "@/modules/financial-inbox/application/use-cases/manage-rules.use-case";
import { PrismaUserLearningPatternRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-user-learning-pattern.repository";
import { PrismaUserRuleRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-user-rule.repository";
import {
  ruleActionSchema,
  ruleConditionSchema,
} from "@/modules/financial-inbox/domain/schemas/user-rule.schema";
import type { RulesListResponse } from "@/types/rules";

const createRuleSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  condition: ruleConditionSchema,
  action: ruleActionSchema,
});

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ruleRepository = new PrismaUserRuleRepository(prisma);
  const patternRepository = new PrismaUserLearningPatternRepository(prisma);
  const useCase = new ListRulesAndPatternsUseCase(ruleRepository, patternRepository);

  const result = await useCase.execute({ userId: session.user.id });

  const response: RulesListResponse = {
    rules: result.rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      condition: rule.condition,
      action: rule.action,
      priority: rule.priority,
      isActive: rule.isActive,
      conditionLabel: formatRuleConditionLabel(rule.condition),
      actionLabel: formatRuleActionLabel(rule.action),
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    })),
    patterns: result.patterns.map((pattern) => ({
      id: pattern.id,
      patternType: pattern.patternType,
      patternTypeLabel: formatPatternTypeLabel(pattern.patternType),
      keyword: pattern.inputSignal.keyword,
      targetLabel: formatPatternTargetLabel(pattern.outputSignal),
      confidence: pattern.confidence,
      occurrences: pattern.occurrences,
      lastSeenAt: pattern.lastSeenAt.toISOString(),
      createdAt: pattern.createdAt.toISOString(),
    })),
  };

  return NextResponse.json(response);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ruleRepository = new PrismaUserRuleRepository(prisma);
  const useCase = new CreateUserRuleUseCase(ruleRepository);

  const name =
    parsed.data.name ??
    `${formatRuleConditionLabel(parsed.data.condition)} → ${formatRuleActionLabel(parsed.data.action)}`;

  try {
    const rule = await useCase.execute({
      userId: session.user.id,
      name: name.slice(0, 120),
      description: parsed.data.description,
      condition: parsed.data.condition,
      action: parsed.data.action,
      priority: parsed.data.priority,
    });

    return NextResponse.json(
      {
        id: rule.id,
        name: rule.name,
        conditionLabel: formatRuleConditionLabel(rule.condition),
        actionLabel: formatRuleActionLabel(rule.action),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create rule";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
