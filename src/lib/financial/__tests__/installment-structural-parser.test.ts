import { describe, expect, it } from "vitest";
import {
  buildInstallmentDedupKey,
  buildStableInstallmentGroupId,
  parseInstallmentStructure,
} from "../installment-structural-parser";

describe("parseInstallmentStructure", () => {
  it.each([
    ["FortlevEnergia 02/12", "FortlevEnergia", 2, 12],
    ["ANUIDADE DIFERENCIADA 01/12", "ANUIDADE DIFERENCIADA", 1, 12],
    ["BLU PRA DORMIR C05/05", "BLU PRA DORMIR", 5, 5],
    ["OneHeal01/02", "OneHeal", 1, 2],
    ["MARKETI01/12", "MARKETI", 1, 12],
  ] as const)("parseia %s", (input, descricaoBase, numero, total) => {
    const parsed = parseInstallmentStructure(input);
    expect(parsed.hadInstallmentMarker).toBe(true);
    expect(parsed.descricaoBase).toBe(descricaoBase);
    expect(parsed.numeroParcela).toBe(numero);
    expect(parsed.totalParcelas).toBe(total);
  });

  it("retorna parcela única quando não há marcador", () => {
    const parsed = parseInstallmentStructure("Supermercado Extra");
    expect(parsed.hadInstallmentMarker).toBe(false);
    expect(parsed.numeroParcela).toBe(1);
    expect(parsed.totalParcelas).toBe(1);
    expect(parsed.descricaoBase).toBe("Supermercado Extra");
  });
});

describe("buildStableInstallmentGroupId", () => {
  it("gera id determinístico para mesmos inputs", () => {
    const input = {
      userId: "user-1",
      cardId: "card-1",
      descricaoBase: "FortlevEnergia",
      valorParcela: 150.5,
      totalParcelas: 12,
      primeiraParcelaAproximada: "2026-01-15",
    };

    const a = buildStableInstallmentGroupId(input);
    const b = buildStableInstallmentGroupId(input);

    expect(a).toBe(b);
    expect(a.startsWith("ig_")).toBe(true);
  });

  it("gera ids diferentes quando totalParcelas muda", () => {
    const base = {
      userId: "user-1",
      cardId: "card-1",
      descricaoBase: "FortlevEnergia",
      valorParcela: 150,
      primeiraParcelaAproximada: "2026-01-15",
    };

    const g12 = buildStableInstallmentGroupId({ ...base, totalParcelas: 12 });
    const g6 = buildStableInstallmentGroupId({ ...base, totalParcelas: 6 });

    expect(g12).not.toBe(g6);
  });
});

describe("buildInstallmentDedupKey", () => {
  it("gera chave estável para deduplicação", () => {
    const key = buildInstallmentDedupKey({
      cardId: "card-1",
      descricaoBase: "FortlevEnergia 02/12",
      numeroParcela: 2,
      totalParcelas: 12,
      valor: 150.5,
      date: "2026-02-15",
    });

    expect(key).toHaveLength(64);
    expect(buildInstallmentDedupKey({
      cardId: "card-1",
      descricaoBase: "FortlevEnergia 02/12",
      numeroParcela: 2,
      totalParcelas: 12,
      valor: 150.5,
      date: "2026-02-15",
    })).toBe(key);
  });
});
