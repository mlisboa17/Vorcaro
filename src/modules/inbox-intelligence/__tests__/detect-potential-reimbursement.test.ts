import { describe, expect, it } from "vitest";
import { detectPotentialReimbursement } from "../domain/services/detect-potential-reimbursement";

describe("detectPotentialReimbursement", () => {
  it("detecta despesa corporativa", () => {
    const result = detectPotentialReimbursement("HOTEL CLIENTE VIAGEM CORPORATIVA");
    expect(result.isPotentialReimbursement).toBe(true);
    expect(result.reimbursementConfidence).toBeGreaterThan(0);
  });

  it("não marca compra comum", () => {
    const result = detectPotentialReimbursement("SUPERMERCADO EXTRA");
    expect(result.isPotentialReimbursement).toBe(false);
  });
});
