import { describe, expect, it } from "vitest";
import { MoneyLeakDetectorService } from "../application/services/money-leak-detector.service";

describe("MoneyLeakDetectorService", () => {
  const detector = new MoneyLeakDetectorService();

  it("detecta gastos invisíveis recorrentes pequenos", () => {
    const months = new Map([
      ["1", 4],
      ["2", 4],
    ]);
    const findings = detector.detect(
      [
        { id: "1", descricao: "App Store", valor: 9.9, cardId: null, financialAccountId: "a" },
        { id: "2", descricao: "Jogo mobile", valor: 14.9, cardId: null, financialAccountId: "a" },
      ],
      months,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].monthlyTotal).toBe(24.8);
    expect(findings[0].itemCount).toBe(2);
  });

  it("eleva prioridade e marca trend UP com crescimento por 3 meses", () => {
    const months = new Map([["1", 4]]);
    const spendPoints = [
      { recurringId: "1", description: "App Store", monthKey: "2026-01", amount: 30 },
      { recurringId: "1", description: "App Store", monthKey: "2026-02", amount: 60 },
      { recurringId: "1", description: "App Store", monthKey: "2026-03", amount: 94 },
    ];

    const findings = detector.detect(
      [
        { id: "1", descricao: "App Store", valor: 9.9, cardId: null, financialAccountId: "a" },
        { id: "2", descricao: "Jogo mobile", valor: 14.9, cardId: null, financialAccountId: "a" },
      ],
      months,
      spendPoints,
    );

    expect(findings[0].trend).toBe("UP");
    expect(findings[0].suggestedPriority).toBe("MEDIUM");
    expect(findings[0].monthlyHistory[0]).toBeLessThan(findings[0].monthlyHistory[2]);
  });
});
