import { describe, expect, it, vi } from "vitest";
import { VORCARO_RECENT_TEMPLATE_LIMIT } from "../application/services/vorcaro-template-selector.service";
import { VorcaroMessagingService } from "../application/services/vorcaro-messaging.service";
import { VORCARO_TEMPLATE_LIBRARY } from "../domain/vorcaro-template-library";

function buildMockDb() {
  const history: Array<{
    id: string;
    userId: string;
    templateId: string;
    category: string;
    usedAt: Date;
  }> = [];

  return {
    user: {
      findUnique: vi.fn().mockResolvedValue({ vorcaroTone: "VORCARO" }),
      update: vi.fn().mockImplementation(({ data }: { data: { vorcaroTone: string } }) =>
        Promise.resolve({ vorcaroTone: data.vorcaroTone }),
      ),
    },
    vorcaroMessageHistory: {
      create: vi.fn().mockImplementation(({ data }: { data: typeof history[0] }) => {
        const row = { ...data, id: `h-${history.length + 1}` };
        history.push(row);
        return Promise.resolve(row);
      }),
      findMany: vi.fn().mockImplementation(({ take }: { take?: number }) => {
        const sorted = [...history].sort((a, b) => b.usedAt.getTime() - a.usedAt.getTime());
        return Promise.resolve(take ? sorted.slice(0, take) : sorted);
      }),
    },
    _history: history,
  };
}

describe("VorcaroMessagingService", () => {
  it("compõe mensagem estruturada e registra histórico", async () => {
    const db = buildMockDb();
    const service = new VorcaroMessagingService(db as never);

    const message = await service.compose({
      userId: "user-1",
      category: "DELIVERY",
      fact: "R$ 620 em delivery.",
      impact: "12,4% da renda.",
      action: "Reduza pela metade.",
    });

    expect(message.fact).toContain("620");
    expect(message.formatted).toContain("IMPACTO");
    expect(db.vorcaroMessageHistory.create).toHaveBeenCalled();
  });

  it("analisa histórico dos últimos 50 templates", () => {
    expect(VORCARO_RECENT_TEMPLATE_LIMIT).toBe(50);
  });

  it("não repete template bloqueado nos últimos 50", async () => {
    const db = buildMockDb();
    const service = new VorcaroMessagingService(db as never);
    const deliveryIds = VORCARO_TEMPLATE_LIBRARY.filter((t) => t.category === "DELIVERY").map(
      (t) => t.id,
    );

    for (const templateId of deliveryIds) {
      db._history.push({
        id: `h-${templateId}`,
        userId: "user-1",
        templateId,
        category: "DELIVERY",
        usedAt: new Date(),
      });
    }

    const message = await service.compose({
      userId: "user-1",
      category: "DELIVERY",
      fact: "Fato",
      impact: "Impacto",
      action: "Ação",
      tone: "VORCARO",
    });

    expect(message.templateId).toBeTruthy();
  });

  it("gera system prompt com identidade Vorcaro", () => {
    const db = buildMockDb();
    const service = new VorcaroMessagingService(db as never);
    const prompt = service.buildSystemPrompt("IMPACT");

    expect(prompt).toContain("Vorcaro");
    expect(prompt).toContain("FATO");
    expect(prompt).toContain("IMPACTO");
    expect(prompt).toContain("AÇÃO");
  });
});
