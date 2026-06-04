import { describe, expect, it } from "vitest";
import { SubscriptionDetectorService } from "../application/services/subscription-detector.service";

describe("SubscriptionDetectorService", () => {
  const detector = new SubscriptionDetectorService();

  it("detecta duplicidade de streaming em cartões diferentes com descrições sujas", () => {
    const findings = detector.detect([
      {
        id: "1",
        descricao: "RENE*NETFLIX 102394",
        valor: 55.9,
        cardId: "card-a",
        financialAccountId: "acc-1",
      },
      {
        id: "2",
        descricao: "NETFLIX ENTRETENIMEN",
        valor: 45.9,
        cardId: "card-b",
        financialAccountId: "acc-2",
      },
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0].normalizedName).toBe("Netflix");
    expect(findings[0].suspectedIds).toEqual(["1", "2"]);
    expect(findings[0].potentialMonthlySaving).toBeGreaterThan(0);
    expect(findings[0].cardIds).toHaveLength(2);
  });

  it("detecta Spotify com descrições sujas em contas diferentes", () => {
    const findings = detector.detect([
      {
        id: "s1",
        descricao: "SFTY*SPOTIFY PREMIUM",
        valor: 21.9,
        cardId: "card-x",
        financialAccountId: "acc-a",
      },
      {
        id: "s2",
        descricao: "SPOTIFY",
        valor: 21.9,
        cardId: "card-y",
        financialAccountId: "acc-b",
      },
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0].normalizedName).toBe("Spotify");
  });

  it("não alerta com uma única ocorrência", () => {
    const findings = detector.detect([
      {
        id: "1",
        descricao: "Spotify",
        valor: 21.9,
        cardId: "card-a",
        financialAccountId: "acc-1",
      },
    ]);
    expect(findings).toHaveLength(0);
  });
});
