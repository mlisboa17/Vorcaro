import { describe, expect, it } from "vitest";
import {
  buildTimelineFingerprint,
  monthPeriodKey,
  percentChange,
  quarterPeriodKey,
  resolveTrendDirection,
  resolveTrendDirectionInverse,
} from "../domain/services/timeline-fingerprint";

describe("timeline-fingerprint", () => {
  it("gera fingerprint no formato userId:eventType:periodo", () => {
    const d = new Date("2026-06-15T12:00:00.000Z");
    expect(buildTimelineFingerprint("USER123", "NET_WORTH_INCREASE", monthPeriodKey(d))).toBe(
      "USER123:NET_WORTH_INCREASE:2026-06",
    );
    expect(buildTimelineFingerprint("USER123", "GOAL_COMPLETED", "GOAL_ABC")).toBe(
      "USER123:GOAL_COMPLETED:GOAL_ABC",
    );
    expect(
      buildTimelineFingerprint("USER123", "SPENDING_REDUCTION", `MONTHLY:${quarterPeriodKey(d)}`),
    ).toBe("USER123:SPENDING_REDUCTION:MONTHLY:2026-Q2");
  });

  it("calcula variação percentual", () => {
    expect(percentChange(110, 100)).toBe(10);
    expect(percentChange(0, 0)).toBe(0);
  });

  it("resolve tendências", () => {
    expect(resolveTrendDirection(5)).toBe("IMPROVING");
    expect(resolveTrendDirection(-5)).toBe("DECLINING");
    expect(resolveTrendDirection(1)).toBe("STABLE");
    expect(resolveTrendDirectionInverse(-8)).toBe("IMPROVING");
  });
});
