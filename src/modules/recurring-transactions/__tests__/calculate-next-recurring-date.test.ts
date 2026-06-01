import { describe, expect, it } from "vitest";
import {
  calculateNextRecurringDate,
  computeProximaExecucaoForSeed,
  parseDateOnlyToUtcNoon,
} from "../domain/services/calculate-next-recurring-date";

describe("calculateNextRecurringDate", () => {
  it("avança recorrência mensal preservando dia original", () => {
    const current = parseDateOnlyToUtcNoon("2026-01-05");
    const next = calculateNextRecurringDate(current, "MENSAL", 5);

    expect(next.toISOString().slice(0, 10)).toBe("2026-02-05");
  });

  it("avança recorrência semanal em 7 dias", () => {
    const current = parseDateOnlyToUtcNoon("2026-05-04");
    const next = calculateNextRecurringDate(current, "SEMANAL", 4);

    expect(next.toISOString().slice(0, 10)).toBe("2026-05-11");
  });

  it("avança recorrência quinzenal em 15 dias", () => {
    const current = parseDateOnlyToUtcNoon("2026-05-06");
    const next = calculateNextRecurringDate(current, "QUINZENAL", 6);

    expect(next.toISOString().slice(0, 10)).toBe("2026-05-21");
  });

  it("computeProximaExecucaoForSeed avança até a data de referência", () => {
    const dataInicio = parseDateOnlyToUtcNoon("2026-01-05");
    const proxima = computeProximaExecucaoForSeed(
      dataInicio,
      "MENSAL",
      5,
      parseDateOnlyToUtcNoon("2026-05-31"),
    );

    expect(proxima.toISOString().slice(0, 10)).toBe("2026-05-05");
  });
});
