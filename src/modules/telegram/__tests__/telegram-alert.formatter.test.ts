import { describe, expect, it } from "vitest";
import { TelegramAlertFormatter } from "../application/formatters/telegram-alert.formatter";
import type { FinancialAlertRecord } from "@/modules/financial-alerts/domain/types/financial-alert";

const base: FinancialAlertRecord = {
  id: "1",
  userId: "u1",
  type: "CASHFLOW_WARNING",
  severity: "CRITICAL",
  title: "Saldo negativo",
  description: "Projeção negativa em 10 dias.",
  status: "OPEN",
  fingerprint: "CASHFLOW_WARNING:next-15d",
  metadata: null,
  actionUrl: "/dashboard/cashflow",
  createdAt: new Date("2026-06-01"),
  updatedAt: new Date("2026-06-01"),
  resolvedAt: null,
};

describe("TelegramAlertFormatter", () => {
  const formatter = new TelegramAlertFormatter();

  it("formata alerta único em markdown escapado", () => {
    const text = formatter.formatSingle(base);
    expect(text).toContain("Saldo negativo");
    expect(text).toContain("dashboard/cashflow");
  });

  it("monta payload de digest com críticos e warnings", () => {
    const payload = formatter.formatDigest([
      base,
      {
        ...base,
        id: "2",
        type: "GOAL_AT_RISK",
        severity: "WARNING",
        title: "Meta em risco",
      },
    ]);
    expect(payload.parseMode).toBe("MarkdownV2");
    expect(payload.alertIds).toEqual(["1", "2"]);
    expect(payload.text).toContain("Críticos");
    expect(payload.text).toContain("Atenção");
  });
});
