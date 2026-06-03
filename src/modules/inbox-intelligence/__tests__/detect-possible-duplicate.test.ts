import { describe, expect, it } from "vitest";
import { detectPossibleDuplicate } from "../domain/services/detect-possible-duplicate";

describe("detectPossibleDuplicate", () => {
  it("detecta mesmo importHash", () => {
    const result = detectPossibleDuplicate({
      description: "OUTBACK",
      amount: 100,
      importHash: "abc",
      candidates: [
        {
          id: "x",
          description: "OUTBACK",
          amount: 100,
          importHash: "abc",
        },
      ],
    });

    expect(result.possibleDuplicate).toBe(true);
    expect(result.duplicateConfidence).toBeGreaterThanOrEqual(90);
  });

  it("não marca quando valores diferem", () => {
    const result = detectPossibleDuplicate({
      description: "OUTBACK",
      amount: 100,
      candidates: [
        {
          id: "x",
          description: "OUTBACK",
          amount: 200,
        },
      ],
    });

    expect(result.possibleDuplicate).toBe(false);
  });
});
