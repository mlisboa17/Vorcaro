import type { PrismaClient } from "@prisma/client";
import type { VorcaroToolResult } from "../../domain/types/vorcaro-intent";

export class CardListTool {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(userId: string): Promise<VorcaroToolResult> {
    const cards = await this.prisma.card.findMany({
      where: { userId, isActive: true },
      select: {
        name: true,
        institutionName: true,
        brand: true,
        type: true,
        lastFourDigits: true,
      },
      orderBy: { name: "asc" },
    });

    const lines = cards.map((card) => {
      const suffix = card.lastFourDigits ? ` •••• ${card.lastFourDigits}` : "";
      const institution = card.institutionName ? ` (${card.institutionName})` : "";
      return `• ${card.name}${institution}${suffix}`;
    });

    const summary =
      cards.length > 0
        ? `Você possui ${cards.length} cartão${cards.length === 1 ? "" : "ões"} ativo${cards.length === 1 ? "" : "s"}:`
        : "Você ainda não possui cartões cadastrados.";

    return {
      intent: "CARD_LIST",
      title: "Seus cartões",
      summary: [summary, "", ...lines].join("\n"),
      facts: [],
      metrics: { cardCount: cards.length },
      recommendations: [],
    };
  }
}
