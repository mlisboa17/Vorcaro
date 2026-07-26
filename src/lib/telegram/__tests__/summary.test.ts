import { describe, expect, it } from "vitest";
import { buildSummaryView, parseSummaryCallback, parseSummaryDays } from "@/lib/telegram/summary";
import { normalizeSinceDays, type PeriodSummary } from "@/modules/reports/application/services/weekly-summary.service";

function summary(over: Partial<PeriodSummary> = {}): PeriodSummary {
  return {
    sinceDays: 7,
    totalExpenses: 0,
    totalIncome: 0,
    netBalance: 0,
    transactionCount: 0,
    topCategories: [],
    activeAlerts: 0,
    ...over,
  };
}

describe("normalizeSinceDays (19.1)", () => {
  it("default 7 e limites 1..90", () => {
    expect(normalizeSinceDays(undefined)).toBe(7);
    expect(normalizeSinceDays(0)).toBe(7);
    expect(normalizeSinceDays(30)).toBe(30);
    expect(normalizeSinceDays(999)).toBe(90);
    expect(normalizeSinceDays(-5)).toBe(1);
    expect(normalizeSinceDays(3.9)).toBe(3);
  });
});

describe("parseSummaryDays (19.2)", () => {
  it("extrai dias ou usa default", () => {
    expect(parseSummaryDays("/resumo")).toBe(7);
    expect(parseSummaryDays("/resumo 30")).toBe(30);
    expect(parseSummaryDays("/resumo@VorcaroBot 15")).toBe(15);
    expect(parseSummaryDays("/resumo abc")).toBe(7);
  });
});

describe("buildSummaryView (19.1)", () => {
  it("período vazio → sem movimentações", () => {
    const view = buildSummaryView(summary());
    expect(view.text).toContain("Sem movimentações");
    expect(view.keyboard[0][0].callback_data).toBe("home_open");
  });

  it("com dados mostra totais, saldo e top categorias", () => {
    const view = buildSummaryView(
      summary({
        totalIncome: 1000,
        totalExpenses: 600,
        netBalance: 400,
        transactionCount: 12,
        topCategories: [
          { categoryId: "c1", name: "Alimentação", total: 300 },
          { categoryId: "c2", name: "Transporte", total: 200 },
        ],
      }),
    );
    expect(view.text).toContain("Receitas");
    expect(view.text).toContain("🟢"); // saldo positivo
    expect(view.text).toContain("Alimentação");
    expect(view.keyboard[0].map((b) => b.callback_data)).toEqual(["sum_details", "sum_export"]);
  });

  it("saldo negativo usa 🔴 e alerta adiciona botão", () => {
    const view = buildSummaryView(
      summary({ totalExpenses: 500, netBalance: -500, transactionCount: 3, activeAlerts: 2 }),
    );
    expect(view.text).toContain("🔴");
    expect(view.text).toContain("2 alertas ativos");
    expect(view.keyboard.some((row) => row.some((b) => b.callback_data === "home_alerts"))).toBe(true);
  });

  it("parseSummaryCallback reconhece botões", () => {
    expect(parseSummaryCallback("sum_details")).toBe("details");
    expect(parseSummaryCallback("sum_export")).toBe("export");
    expect(parseSummaryCallback("home_open")).toBeNull();
  });
});
