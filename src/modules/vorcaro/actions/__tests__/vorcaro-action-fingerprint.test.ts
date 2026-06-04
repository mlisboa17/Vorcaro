import { describe, expect, it } from "vitest";
import { buildVorcaroActionFingerprint } from "../domain/services/vorcaro-action-fingerprint";

describe("vorcaro-action-fingerprint", () => {
  it("gera fingerprint OPEN_ALERT:alertId", () => {
    expect(buildVorcaroActionFingerprint("OPEN_ALERT", { alertId: "a1" })).toBe(
      "OPEN_ALERT:a1",
    );
  });

  it("gera fingerprint OPEN_DASHBOARD_SECTION", () => {
    expect(
      buildVorcaroActionFingerprint("OPEN_DASHBOARD_SECTION", { section: "/dashboard/cashflow" }),
    ).toBe("OPEN_DASHBOARD_SECTION:/dashboard/cashflow");
  });
});
