import { describe, expect, it } from "vitest";
import {
  DASHBOARD_NAV_GROUPS,
  VORCARO_HUB_CARDS,
} from "@/lib/navigation/dashboard-nav";

describe("dashboard-nav Sprint 14.8", () => {
  it("agrupa menu em blocos simplificados com menos itens no topo", () => {
    const allItems = DASHBOARD_NAV_GROUPS.flatMap((g) => g.items);
    expect(allItems.length).toBe(18);
    expect(DASHBOARD_NAV_GROUPS.map((g) => g.title)).toEqual([
      "Visão Geral",
      "Financeiro",
      "Planejamento",
      "Inteligência",
      "Patrimônio",
      "Configurações",
    ]);
  });

  it("preserva rotas existentes no menu", () => {
    const hrefs = new Set(DASHBOARD_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href)));
    expect(hrefs.has("/dashboard/inbox")).toBe(true);
    expect(hrefs.has("/dashboard/import")).toBe(true);
    expect(hrefs.has("/dashboard/vorcaro")).toBe(true);
    expect(hrefs.has("/dashboard/rules")).toBe(true);
    expect(hrefs.has("/dashboard/vorcaro/timeline")).toBe(true);
  });

  it("não expõe submódulos Vorcaro diretamente no menu lateral", () => {
    const labels = DASHBOARD_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.label));
    expect(labels).not.toContain("Vorcaro Chat");
    expect(labels).not.toContain("Ações Vorcaro");
    expect(labels).not.toContain("Memória Financeira");
    expect(labels).not.toContain("Vorcaro Insights");
  });

  it("hub Vorcaro lista cards para submódulos", () => {
    const hubHrefs = VORCARO_HUB_CARDS.map((c) => c.href);
    expect(hubHrefs).toEqual([
      "/dashboard/vorcaro/chat",
      "/dashboard/vorcaro/actions",
      "/dashboard/vorcaro/followups",
      "/dashboard/vorcaro/timeline",
      "/dashboard/advisor",
    ]);
  });

  it("marca hub Vorcaro com exactMatch", () => {
    const vorcaro = DASHBOARD_NAV_GROUPS[0].items.find((i) => i.href === "/dashboard/vorcaro");
    expect(vorcaro?.exactMatch).toBe(true);
  });
});
