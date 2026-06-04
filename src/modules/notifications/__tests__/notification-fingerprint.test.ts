import { describe, expect, it } from "vitest";
import {
  buildDeliveryFingerprint,
  buildDigestFingerprint,
  buildEventFingerprint,
} from "../domain/services/notification-fingerprint";

describe("notification-fingerprint", () => {
  it("gera fingerprint de evento estável", () => {
    expect(buildEventFingerprint("GOAL_AT_RISK", "user-1", "goal-abc")).toBe(
      "GOAL_AT_RISK:user-1:goal-abc",
    );
  });

  it("inclui canal no fingerprint de entrega", () => {
    expect(buildDeliveryFingerprint("RECEIVABLE_OVERDUE", "u1", "recv-1", "TELEGRAM")).toBe(
      "RECEIVABLE_OVERDUE:u1:recv-1:TELEGRAM",
    );
  });

  it("gera fingerprint de digest por data", () => {
    expect(buildDigestFingerprint("user-1", "DAILY_DIGEST", "2026-06-04")).toBe(
      "DAILY_DIGEST:user-1:2026-06-04",
    );
  });
});
