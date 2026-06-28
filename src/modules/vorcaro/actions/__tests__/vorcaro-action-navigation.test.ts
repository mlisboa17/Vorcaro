import { describe, expect, it } from "vitest";
import { buildNavigationTarget } from "../domain/services/vorcaro-action-navigation";

describe("vorcaro-action-navigation", () => {
  it("mapeia OPEN_RECEIVABLE com id", () => {
    const nav = buildNavigationTarget("OPEN_RECEIVABLE", { receivableId: "rcv-1" });
    expect(nav.targetUrl).toBe("/dashboard/receivables?id=rcv-1");
  });

  it("mapeia CREATE_RULE_SUGGESTION sem mutação", () => {
    const nav = buildNavigationTarget("CREATE_RULE_SUGGESTION", {});
    expect(nav.targetUrl).toBe("/dashboard/automation/rules");
  });

  it("mapeia OPEN_MONEY_LEAK para transações", () => {
    const nav = buildNavigationTarget("OPEN_MONEY_LEAK", {});
    expect(nav.targetUrl).toBe("/dashboard/transactions");
  });
});
