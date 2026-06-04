import { describe, expect, it } from "vitest";
import {
  computeInitialNextCheckAt,
  computeNextCheckAtAfterReminder,
  getFollowUpBackoffDays,
} from "../domain/services/vorcaro-followup-backoff";

describe("getFollowUpBackoffDays", () => {
  it("retorna 1 dia para agendamento inicial (checkCount=0)", () => {
    expect(getFollowUpBackoffDays(0)).toBe(1);
  });

  it("retorna 3 dias após o primeiro lembrete (checkCount=1)", () => {
    expect(getFollowUpBackoffDays(1)).toBe(3);
  });

  it("retorna 3 dias quando checkCount após lembrete é 1", () => {
    expect(getFollowUpBackoffDays(1)).toBe(3);
  });

  it("retorna 7 dias quando checkCount >= 2", () => {
    expect(getFollowUpBackoffDays(2)).toBe(7);
    expect(getFollowUpBackoffDays(5)).toBe(7);
  });
});

describe("computeNextCheckAtAfterReminder", () => {
  const base = new Date("2026-06-01T12:00:00.000Z");

  it("após 1º lembrete agenda +3 dias", () => {
    const next = computeNextCheckAtAfterReminder(base, 1);
    expect(next.getTime() - base.getTime()).toBe(3 * 24 * 60 * 60 * 1000);
  });

  it("após 2º lembrete agenda +7 dias", () => {
    const next = computeNextCheckAtAfterReminder(base, 2);
    expect(next.getTime() - base.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe("computeInitialNextCheckAt", () => {
  it("primeiro check em +1 dia", () => {
    const base = new Date("2026-06-01T12:00:00.000Z");
    const next = computeInitialNextCheckAt(base);
    expect(next.getTime() - base.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
