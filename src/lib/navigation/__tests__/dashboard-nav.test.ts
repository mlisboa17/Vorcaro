import { describe, expect, it } from "vitest";
import { DASHBOARD_NAV_GROUPS } from "@/lib/navigation/dashboard-nav";

describe("dashboard-nav layout validation", () => {
  it("agrupa menu em exatamente 6 itens", () => {
    const allItems = DASHBOARD_NAV_GROUPS.flatMap((g) => g.items);
    expect(allItems.length).toBe(6);
    expect(DASHBOARD_NAV_GROUPS.map((g) => g.title)).toEqual(["Menu Principal"]);
  });

  it("exibe as rotas corretas", () => {
    const hrefs = DASHBOARD_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toEqual([
      "/dashboard/inbox",
      "/dashboard/cashflow",
      "/dashboard/patrimony",
      "/dashboard/consorcios",
      "/dashboard/settings?tab=orcamentos",
      "/dashboard/statements",
    ]);
  });
});
