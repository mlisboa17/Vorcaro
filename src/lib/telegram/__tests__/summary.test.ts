import { describe, expect, it } from "vitest";
import { buildSummaryView, parseSummaryCallback, parseSummaryDays } from "@/lib/telegram/summary";
import { generateWeeklySummaryCsv } from "@/lib/telegram/weekly-summary-export";
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
        sinceDays: 7,
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
    const callbackData = view.keyboard[0].map((b) => b.callback_data);
    expect(callbackData[0]).toMatch(/^sum_details:\d+$/);
    expect(callbackData[1]).toBe("sum_export");
  });

  it("saldo negativo usa 🔴 e alerta adiciona botão", () => {
    const view = buildSummaryView(
      summary({ totalExpenses: 500, netBalance: -500, transactionCount: 3, activeAlerts: 2 }),
    );
    expect(view.text).toContain("🔴");
    expect(view.text).toContain("2 alertas ativos");
    expect(view.keyboard.some((row) => row.some((b) => b.callback_data === "home_alerts"))).toBe(true);
  });

  it("parseSummaryCallback reconhece botões (21.2)", () => {
    const details = parseSummaryCallback("sum_details");
    expect(details?.action).toBe("details");
    expect(details?.period).toBeUndefined();

    const detailsWithPeriod = parseSummaryCallback("sum_details:30");
    expect(detailsWithPeriod?.action).toBe("details");
    expect(detailsWithPeriod?.period).toBe(30);

    const exportAction = parseSummaryCallback("sum_export");
    expect(exportAction?.action).toBe("export");

    expect(parseSummaryCallback("home_open")).toBeNull();
  });
});

describe("generateWeeklySummaryCsv (21.1)", () => {
  it("gera CSV com cabeçalho e resumo geral", () => {
    const csv = generateWeeklySummaryCsv(
      summary({
        sinceDays: 7,
        totalIncome: 1000,
        totalExpenses: 600,
        netBalance: 400,
        transactionCount: 5,
      }),
    );
    expect(csv).toContain("Resumo Financeiro");
    expect(csv).toContain("Total de Transações");
    expect(csv).toContain("Total de Receitas");
    expect(csv).toContain("Total de Despesas");
    expect(csv).toContain("Saldo Líquido");
  });

  it("inclui top categorias quando presentes", () => {
    const csv = generateWeeklySummaryCsv(
      summary({
        topCategories: [
          { categoryId: "c1", name: "Alimentação", total: 300 },
          { categoryId: "c2", name: "Transporte", total: 200 },
        ],
      }),
    );
    expect(csv).toContain("TOP CATEGORIAS");
    expect(csv).toContain("Alimentação");
    expect(csv).toContain("Transporte");
  });

  it("inclui alertas quando presentes", () => {
    const csv = generateWeeklySummaryCsv(summary({ activeAlerts: 3 }));
    expect(csv).toContain("ALERTAS");
    expect(csv).toContain("3");
  });

  it("escapa aspas em nomes de categorias", () => {
    const csv = generateWeeklySummaryCsv(
      summary({
        topCategories: [{ categoryId: "c1", name: 'Categoria com "aspas"', total: 100 }],
      }),
    );
    expect(csv).toContain('Categoria com ""aspas""');
  });

  it("período de 30 dias aparece corretamente", () => {
    const csv = generateWeeklySummaryCsv(summary({ sinceDays: 30 }));
    expect(csv).toContain("30 dias");
  });

  it("CSV formatado com quebras de linha CRLF e espaçamento", () => {
    const csv = generateWeeklySummaryCsv(summary({ totalIncome: 1000 }));
    expect(csv).toContain("\r\n");
    const lines = csv.split("\r\n");
    expect(lines.length).toBeGreaterThan(5);
  });

  it("CSV com múltiplas categorias mantém ordem decrescente", () => {
    const csv = generateWeeklySummaryCsv(
      summary({
        topCategories: [
          { categoryId: "c1", name: "Despesa A", total: 500 },
          { categoryId: "c2", name: "Despesa B", total: 300 },
          { categoryId: "c3", name: "Despesa C", total: 200 },
        ],
      }),
    );
    const despesaAPos = csv.indexOf("Despesa A");
    const despesaBPos = csv.indexOf("Despesa B");
    const despesaCPos = csv.indexOf("Despesa C");
    expect(despesaAPos).toBeLessThan(despesaBPos);
    expect(despesaBPos).toBeLessThan(despesaCPos);
  });

  it("CSV vazio (sem movimentações) só mostra cabeçalho e totais zeros", () => {
    const csv = generateWeeklySummaryCsv(summary({ transactionCount: 0 }));
    expect(csv).toContain("Total de Transações");
    expect(csv).toContain("0");
    expect(csv).not.toContain("TOP CATEGORIAS");
  });

  it("CSV com valores negativos (saldo negativo) formata corretamente", () => {
    const csv = generateWeeklySummaryCsv(
      summary({ totalExpenses: 1000, totalIncome: 500, netBalance: -500 }),
    );
    expect(csv).toContain("Total de Receitas");
    expect(csv).toContain("Total de Despesas");
    expect(csv).toContain("Saldo Líquido");
    expect(csv).toContain("-R$");
  });
});
