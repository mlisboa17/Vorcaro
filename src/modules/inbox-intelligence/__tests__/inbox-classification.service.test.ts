import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { InboxClassificationService } from "../application/services/inbox-classification.service";
import type { AiRouterService } from "@/modules/ai/application/services/ai-router.service";
import { READY_TO_CONFIRM_THRESHOLD } from "../domain/types/inbox-classification";

const USER_A = "user-a";
const USER_B = "user-b";

const categories = [
  { id: "cat-food", name: "Alimentação", parentCategoryId: null },
  { id: "cat-rest", name: "Restaurantes", parentCategoryId: "cat-food" },
  { id: "cat-delivery", name: "Delivery", parentCategoryId: "cat-food" },
  { id: "cat-transport", name: "Transporte", parentCategoryId: null },
  { id: "cat-fuel", name: "Combustível", parentCategoryId: "cat-transport" },
  { id: "cat-mobility", name: "Uber e Aplicativos", parentCategoryId: "cat-transport" },
  { id: "cat-health", name: "Saúde", parentCategoryId: null },
  { id: "cat-pharmacy", name: "Farmácia", parentCategoryId: "cat-health" },
];

function createMockDb(userId: string) {
  const patterns =
    userId === USER_A
      ? [
          {
            patternType: "categorization_preference",
            inputSignal: { keyword: "outback" },
            outputSignal: { categoryId: "cat-rest", category: "Restaurantes", type: "EXPENSE" },
            occurrences: 14,
            confidence: 1,
          },
          {
            patternType: "categorization_preference",
            inputSignal: { keyword: "outback tacaruna" },
            outputSignal: { categoryId: "cat-rest", category: "Restaurantes", type: "EXPENSE" },
            occurrences: 3,
            confidence: 1,
          },
        ]
      : [];

  return {
    userLearningPattern: {
      findMany: vi.fn(async ({ where }: { where: { userId: string } }) =>
        where.userId === USER_A ? patterns : [],
      ),
    },
    category: {
      findMany: vi.fn(async ({ where }: { where: { userId: string; isActive?: boolean } }) =>
        where.userId === USER_A || where.userId === USER_B ? categories : [],
      ),
    },
    userRule: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    transaction: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    financialInbox: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaClient;
}

function createMockAiRouter(): AiRouterService {
  return {
    generateJson: vi.fn().mockResolvedValue({
      provider: "groq",
      data: {
        categoriaPrincipal: "Transporte",
        subcategoria: "Combustível",
        expenseType: "EXPENSE",
        confidence: 68,
      },
    }),
  } as unknown as AiRouterService;
}

describe("InboxClassificationService", () => {
  it("prioriza UserRule sobre histórico aprendido", async () => {
    const patterns = [
      {
        patternType: "categorization_preference",
        inputSignal: { keyword: "outback" },
        outputSignal: { categoryId: "cat-rest", category: "Restaurantes", type: "EXPENSE" },
        occurrences: 20,
        confidence: 1,
      },
    ];

    const db = {
      userLearningPattern: { findMany: vi.fn().mockResolvedValue(patterns) },
      category: { findMany: vi.fn().mockResolvedValue(categories) },
      userRule: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "rule-1",
            name: "Outback transporte",
            priority: 80,
            isActive: true,
            condition: { operator: "contains", field: "description", value: "outback" },
            action: { set: "category", value: "cat-mobility" },
          },
        ]),
      },
      transaction: { findMany: vi.fn().mockResolvedValue([]) },
      financialInbox: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;

    const ai = createMockAiRouter();
    const service = new InboxClassificationService(db, ai);

    const result = await service.classify({
      userId: USER_A,
      description: "OUTBACK TACARUNA SHOPP",
    });

    expect(result.source).toBe("rule");
    expect(result.categoryId).toBe("cat-mobility");
    expect(ai.generateJson).not.toHaveBeenCalled();
  });

  it("classifica UBER EATS como delivery e UBER TRIP como mobilidade", async () => {
    const db = createMockDb(USER_B);
    const ai = createMockAiRouter();
    const service = new InboxClassificationService(db, ai);

    const eats = await service.classify({
      userId: USER_B,
      description: "UBER EATS *PEDIDO",
    });
    expect(eats.subcategoriaId).toBe("cat-delivery");
    expect(eats.source).toBe("rule");

    const trip = await service.classify({
      userId: USER_B,
      description: "UBER TRIP SAO PAULO",
    });
    expect(trip.subcategoriaId).toBe("cat-mobility");
    expect(trip.source).toBe("rule");

    const food99 = await service.classify({
      userId: USER_B,
      description: "99FOOD DELIVERY",
    });
    expect(food99.subcategoriaId).toBe("cat-delivery");

    const app99 = await service.classify({
      userId: USER_B,
      description: "99APP CORRIDA",
    });
    expect(app99.subcategoriaId).toBe("cat-mobility");

    expect(ai.generateJson).not.toHaveBeenCalled();
  });

  it("prioriza histórico do usuário com alta confiança (95–100)", async () => {
    const db = createMockDb(USER_A);
    const service = new InboxClassificationService(db, createMockAiRouter());

    const result = await service.classify({
      userId: USER_A,
      description: "OUTBACK TACARUNA SHOPP",
    });

    expect(result.source).toBe("history");
    expect(result.categoryId).toBe("cat-rest");
    expect(result.subcategoriaId).toBe("cat-rest");
    expect(result.confidence).toBeGreaterThanOrEqual(95);
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(result.explanation).toContain("lançamento");
    expect(result.readyToConfirm).toBe(result.confidence >= READY_TO_CONFIRM_THRESHOLD);
    expect(result.reason).toBe(result.explanation);
  });

  it("usa similaridade quando histórico exato não existe (80–94)", async () => {
    const patterns = [
      {
        patternType: "categorization_preference",
        inputSignal: { keyword: "outback tacaruna" },
        outputSignal: { categoryId: "cat-rest", category: "Restaurantes", type: "EXPENSE" },
        occurrences: 5,
        confidence: 1,
      },
    ];

    const db = {
      userLearningPattern: { findMany: vi.fn().mockResolvedValue(patterns) },
      category: { findMany: vi.fn().mockResolvedValue(categories) },
      userRule: { findMany: vi.fn().mockResolvedValue([]) },
      transaction: { findMany: vi.fn().mockResolvedValue([]) },
      financialInbox: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;

    const service = new InboxClassificationService(db, createMockAiRouter());

    const result = await service.classify({
      userId: USER_A,
      description: "OUTBACK SHOPPING TACARUNA",
    });

    expect(result.source).toBe("similarity");
    expect(result.categoryId).toBe("cat-rest");
    expect(result.confidence).toBeGreaterThanOrEqual(80);
    expect(result.confidence).toBeLessThanOrEqual(94);
  });

  it("aplica regra determinística antes da IA", async () => {
    const db = createMockDb(USER_B);
    const ai = createMockAiRouter();
    const service = new InboxClassificationService(db, ai);

    const result = await service.classify({
      userId: USER_B,
      description: "POSTO SHELL BR 101",
    });

    expect(result.source).toBe("rule");
    expect(result.categoryId).toBe("cat-fuel");
    expect(ai.generateJson).not.toHaveBeenCalled();
  });

  it("detecta parcelamento sem chamar IA para parcela", async () => {
    const db = createMockDb(USER_A);
    const ai = createMockAiRouter();
    const service = new InboxClassificationService(db, ai);

    const result = await service.classify({
      userId: USER_A,
      description: "OUTBACK 02/12",
      amount: 150,
    });

    expect(result.installment?.numeroParcela).toBe(2);
    expect(result.installment?.totalParcelas).toBe(12);
    expect(result.installment?.installmentGroup).toMatch(/^ig_/);
    expect(result.source).toBe("history");
    expect(ai.generateJson).not.toHaveBeenCalled();
  });

  it("sinaliza possível reembolso", async () => {
    const db = createMockDb(USER_A);
    const service = new InboxClassificationService(db, createMockAiRouter());

    const result = await service.classify({
      userId: USER_A,
      description: "HOTEL CLIENTE VIAGEM CORPORATIVA",
    });

    expect(result.isPotentialReimbursement).toBe(true);
    expect(result.reimbursementReason).toBeTruthy();
  });

  it("sinaliza possível duplicata por importHash", async () => {
    const db = {
      userLearningPattern: { findMany: vi.fn().mockResolvedValue([]) },
      category: { findMany: vi.fn().mockResolvedValue(categories) },
      userRule: { findMany: vi.fn().mockResolvedValue([]) },
      transaction: { findMany: vi.fn().mockResolvedValue([]) },
      financialInbox: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "other-inbox",
            rawContent: "OUTBACK",
            importHash: "hash-abc",
            metadata: { amount: 100, date: "2026-01-01" },
          },
        ]),
      },
    } as unknown as PrismaClient;

    const ai = createMockAiRouter();
    const service = new InboxClassificationService(db, ai);

    const result = await service.classify({
      userId: USER_A,
      inboxItemId: "inbox-new",
      description: "OUTBACK",
      amount: 100,
      importHash: "hash-abc",
    });

    expect(result.possibleDuplicate).toBe(true);
    expect(result.duplicateReason).toContain("hash");
  });

  it("não sugere categoria inativa", async () => {
    const patterns = [
      {
        patternType: "categorization_preference",
        inputSignal: { keyword: "xyzinativo123" },
        outputSignal: { categoryId: "cat-inactive", category: "Inativa", type: "EXPENSE" },
        occurrences: 5,
        confidence: 1,
      },
    ];

    const db = {
      userLearningPattern: { findMany: vi.fn().mockResolvedValue(patterns) },
      category: { findMany: vi.fn().mockResolvedValue(categories) },
      userRule: { findMany: vi.fn().mockResolvedValue([]) },
      transaction: { findMany: vi.fn().mockResolvedValue([]) },
      financialInbox: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;

    const ai = createMockAiRouter();
    const service = new InboxClassificationService(db, ai);

    const result = await service.classify({
      userId: USER_A,
      description: "COMPRA xyzinativo123 LOJA",
    });

    expect(result.source).not.toBe("history");
    expect(result.categoryId).not.toBe("cat-inactive");
    expect(ai.generateJson).toHaveBeenCalled();
  });

  it("faz fallback para IA quando não há histórico nem regra", async () => {
    const db = createMockDb(USER_B);
    const ai = createMockAiRouter();
    const service = new InboxClassificationService(db, ai);

    const result = await service.classify({
      userId: USER_B,
      description: "LOJA XYZ DESCONHECIDA",
    });

    expect(result.source).toBe("ai");
    expect(ai.generateJson).toHaveBeenCalled();
    expect(result.explanation).toContain("IA");
    expect(result.confidence).toBeLessThanOrEqual(75);
  });

  it("respeita multitenancy — usuário B não vê padrões de A", async () => {
    const db = createMockDb(USER_B);
    const ai = createMockAiRouter();
    const service = new InboxClassificationService(db, ai);

    const result = await service.classify({
      userId: USER_B,
      description: "OUTBACK TACARUNA SHOPP",
    });

    expect(result.source).not.toBe("history");
  });

  it("classifyBatch retorna mapa por inboxItemId", async () => {
    const db = createMockDb(USER_A);
    const service = new InboxClassificationService(db, createMockAiRouter());

    const batch = await service.classifyBatch({
      userId: USER_A,
      items: [
        { inboxItemId: "inbox-1", description: "OUTBACK TACARUNA" },
        { inboxItemId: "inbox-2", description: "OUTBACK TACARUNA SHOPP" },
      ],
    });

    expect(Object.keys(batch)).toEqual(["inbox-1", "inbox-2"]);
    expect(batch["inbox-1"].categoryId).toBe("cat-rest");
  });
});
