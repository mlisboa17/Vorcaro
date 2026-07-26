import { describe, expect, it, vi } from "vitest";
import { InboxLearningService } from "@/modules/inbox-intelligence/application/services/inbox-learning.service";

/** Prisma stub mínimo para o repositório de padrões de aprendizado. */
function buildDb() {
  const created: any[] = [];
  const updated: any[] = [];
  const db = {
    userLearningPattern: {
      findMany: vi.fn(async () => [] as any[]),
      create: vi.fn(async ({ data }: any) => {
        created.push(data);
        return { id: `p-${created.length}`, ...data };
      }),
      update: vi.fn(async ({ data }: any) => {
        updated.push(data);
        return data;
      }),
    },
  } as any;
  return { db, created, updated };
}

describe("Sprint 20 — recordCategoryFeedback (loop de aprendizado)", () => {
  it("correção (categoria escolhida ≠ sugerida) grava preferência + correção", async () => {
    const { db, created } = buildDb();
    const svc = new InboxLearningService(db);

    const res = await svc.recordCategoryFeedback({
      userId: "u1",
      description: "iFood pizza",
      suggestedCategoryId: "cat-transporte",
      chosenCategoryId: "cat-alimentacao",
      chosenCategoryName: "Alimentação",
    });

    expect(res.accepted).toBe(false);
    expect(res.recorded).toBe(true);
    const types = created.map((c) => c.patternType);
    expect(types).toContain("categorization_preference");
    expect(types).toContain("classification_correction");
    const correction = created.find((c) => c.patternType === "classification_correction");
    expect(correction.outputSignal.categoryId).toBe("cat-alimentacao");
  });

  it("aceite (escolhida = sugerida) grava só preferência, sem correção", async () => {
    const { db, created } = buildDb();
    const svc = new InboxLearningService(db);

    const res = await svc.recordCategoryFeedback({
      userId: "u1",
      description: "Uber viagem",
      suggestedCategoryId: "cat-transporte",
      chosenCategoryId: "cat-transporte",
      chosenCategoryName: "Transporte",
    });

    expect(res.accepted).toBe(true);
    const types = created.map((c) => c.patternType);
    expect(types).toContain("categorization_preference");
    expect(types).not.toContain("classification_correction");
  });

  it("regressão zero: descrição sem keyword não grava nada", async () => {
    const { db, created } = buildDb();
    const svc = new InboxLearningService(db);

    const res = await svc.recordCategoryFeedback({
      userId: "u1",
      description: "   ",
      suggestedCategoryId: "cat-a",
      chosenCategoryId: "cat-b",
    });

    expect(res.recorded).toBe(false);
    expect(created).toHaveLength(0);
  });

  it("sem sugestão prévia (IA não classificou) grava preferência sem correção", async () => {
    const { db, created } = buildDb();
    const svc = new InboxLearningService(db);

    await svc.recordCategoryFeedback({
      userId: "u1",
      description: "Mercado Extra",
      suggestedCategoryId: null,
      chosenCategoryId: "cat-alimentacao",
      chosenCategoryName: "Alimentação",
    });

    const types = created.map((c) => c.patternType);
    expect(types).toContain("categorization_preference");
    expect(types).not.toContain("classification_correction");
  });
});
