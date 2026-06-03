import type { FinancialAlertType } from "../types/financial-alert";

export function buildAlertFingerprint(type: FinancialAlertType, key: string): string {
  return `${type}:${key}`;
}
