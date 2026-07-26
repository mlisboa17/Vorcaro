import { describe, expect, it } from "vitest";
import { buildHomeView, hasPending, parseHomeCallback } from "@/lib/telegram/home";

describe("home acionável (18.1.1)", () => {
  it("hasPending reflete as contagens", () => {
    expect(hasPending({ pendingConfirmations: 0, activeAlerts: 0 })).toBe(false);
    expect(hasPending({ pendingConfirmations: 1, activeAlerts: 0 })).toBe(true);
    expect(hasPending({ pendingConfirmations: 0, activeAlerts: 2 })).toBe(true);
  });

  it("home limpa quando não há pendências", () => {
    const view = buildHomeView({ pendingConfirmations: 0, activeAlerts: 0 });
    expect(view.text).toContain("Tudo em dia");
    // só o botão de resumo
    expect(view.keyboard).toHaveLength(1);
    expect(view.keyboard[0][0].callback_data).toBe("home_summary");
  });

  it("home com só lançamentos pendentes", () => {
    const view = buildHomeView({ pendingConfirmations: 2, activeAlerts: 0 });
    expect(view.text).toContain("2 pendências");
    expect(view.text).toContain("2 lançamentos a confirmar");
    expect(view.keyboard[0].map((b) => b.callback_data)).toEqual(["home_confirm"]);
    expect(view.keyboard[1][0].callback_data).toBe("home_summary");
  });

  it("home com lançamentos + alertas (singular/plural corretos)", () => {
    const view = buildHomeView({ pendingConfirmations: 1, activeAlerts: 1 });
    expect(view.text).toContain("2 pendências");
    expect(view.text).toContain("1 lançamento a confirmar");
    expect(view.text).toContain("1 alerta financeiro");
    expect(view.keyboard[0].map((b) => b.callback_data)).toEqual(["home_confirm", "home_alerts"]);
  });

  it("home com só alertas (plural)", () => {
    const view = buildHomeView({ pendingConfirmations: 0, activeAlerts: 3 });
    expect(view.text).toContain("3 alertas financeiros");
    expect(view.keyboard[0].map((b) => b.callback_data)).toEqual(["home_alerts"]);
  });

  it("parseHomeCallback reconhece os 3 botões e ignora o resto", () => {
    expect(parseHomeCallback("home_confirm")).toBe("confirm");
    expect(parseHomeCallback("home_alerts")).toBe("alerts");
    expect(parseHomeCallback("home_summary")).toBe("summary");
    expect(parseHomeCallback("cog_ack:1")).toBeNull();
  });
});
