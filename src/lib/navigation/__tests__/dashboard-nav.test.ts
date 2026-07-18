import { describe, expect, it } from "vitest";
import { DASHBOARD_NAV_GROUPS } from "@/lib/navigation/dashboard-nav";

describe("dashboard-nav layout validation", () => {
  it("agrupa menu em exatamente 10 itens e 2 grupos", () => {
    const allItems = DASHBOARD_NAV_GROUPS.flatMap((g) => g.items);
    expect(allItems.length).toBe(10);
    expect(DASHBOARD_NAV_GROUPS.map((g) => g.title)).toEqual(["Menu Principal", "Configurações"]);
  });

  it("exibe as rotas corretas", () => {
    const hrefs = DASHBOARD_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toEqual([
      "/dashboard/transactions",
      "/dashboard/inbox",
      "/dashboard/cashflow",
      "/dashboard/insights",
      "/dashboard/recurring",
      "/dashboard/installments",
      "/dashboard/investments",
      "/dashboard/statements",
      "/dashboard/receipts",
      "/dashboard/settings",
    ]);
  });
});
