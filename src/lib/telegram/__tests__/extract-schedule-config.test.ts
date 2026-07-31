import { describe, expect, it } from "vitest";
import {
  buildExtractScheduleView,
  buildExtractScheduleConfirmView,
  parseExtractScheduleCallback,
} from "@/lib/telegram/extract-schedule-config";

describe("Extract Schedule Config (Sprint 22.2)", () => {
  describe("buildExtractScheduleView", () => {
    it("mostra opções quando agendamento está inativo", () => {
      const view = buildExtractScheduleView(null);
      expect(view.text).toContain("❌ Agendamento desativado");
      expect(view.text).toContain("Ative um agendamento");
      expect(view.keyboard[0].length).toBe(2); // Semanal e Mensal
      expect(view.keyboard[0][0].text).toContain("Semanal");
      expect(view.keyboard[0][1].text).toContain("Mensal");
    });

    it("mostra status quando agendamento está ativo (semanal)", () => {
      const view = buildExtractScheduleView("WEEKLY");
      expect(view.text).toContain("✅ Agendamento ativo");
      expect(view.text).toContain("Semanal (segundas)");
      expect(view.text).toContain("Deseja mudar");
      expect(view.keyboard.some((row) => row.some((b) => b.text.includes("Desativar")))).toBe(true);
    });

    it("mostra status quando agendamento está ativo (mensal)", () => {
      const view = buildExtractScheduleView("MONTHLY");
      expect(view.text).toContain("✅ Agendamento ativo");
      expect(view.text).toContain("Mensal (1º dia)");
    });

    it("sempre inclui botão voltar para home", () => {
      const view1 = buildExtractScheduleView(null);
      const view2 = buildExtractScheduleView("WEEKLY");
      expect(view1.keyboard.some((row) => row.some((b) => b.callback_data === "home_open"))).toBe(true);
      expect(view2.keyboard.some((row) => row.some((b) => b.callback_data === "home_open"))).toBe(true);
    });
  });

  describe("buildExtractScheduleConfirmView", () => {
    it("mostra detalhes para agendamento semanal", () => {
      const view = buildExtractScheduleConfirmView("WEEKLY");
      expect(view.text).toContain("✅");
      expect(view.text).toContain("segunda-feira");
      expect(view.text).toContain("5h da manhã");
      expect(view.text).toContain("Receitas e despesas da semana");
      expect(view.text).toContain("Top 3 categorias");
      expect(view.keyboard[0][0].text).toContain("Entendi");
    });

    it("mostra detalhes para agendamento mensal", () => {
      const view = buildExtractScheduleConfirmView("MONTHLY");
      expect(view.text).toContain("✅");
      expect(view.text).toContain("1º dia de cada mês");
      expect(view.text).toContain("5h da manhã");
      expect(view.text).toContain("Análise completa");
      expect(view.text).toContain("Distribuição por origem");
      expect(view.text).toContain("Próximos vencimentos");
    });

    it("inclui dica sobre como mudar configuração", () => {
      const view1 = buildExtractScheduleConfirmView("WEEKLY");
      const view2 = buildExtractScheduleConfirmView("MONTHLY");
      expect(view1.text).toContain("/extratos");
      expect(view2.text).toContain("/extratos");
    });
  });

  describe("parseExtractScheduleCallback", () => {
    it("reconhece callback de agendamento semanal", () => {
      expect(parseExtractScheduleCallback("extract_weekly")).toBe("weekly");
    });

    it("reconhece callback de agendamento mensal", () => {
      expect(parseExtractScheduleCallback("extract_monthly")).toBe("monthly");
    });

    it("reconhece callback de desativar", () => {
      expect(parseExtractScheduleCallback("extract_disable")).toBe("disable");
    });

    it("reconhece callback de confirmação", () => {
      expect(parseExtractScheduleCallback("extract_confirm")).toBe("confirm");
    });

    it("retorna null para callbacks desconhecidos", () => {
      expect(parseExtractScheduleCallback("unknown")).toBeNull();
      expect(parseExtractScheduleCallback("extract_invalid")).toBeNull();
      expect(parseExtractScheduleCallback("home_open")).toBeNull();
    });
  });
});
