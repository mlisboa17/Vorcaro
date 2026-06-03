import { describe, expect, it } from "vitest";
import { buildImportHash } from "../financial-import-pipeline";

describe("buildImportHash — parcelamentos", () => {
  it("inclui descricaoBase e parcelas no hash para deduplicação", () => {
    const base = {
      userId: "user-1",
      importType: "FATURA_CARTAO" as const,
      sourceFileName: "fatura.pdf",
      cardId: "card-1",
      line: {
        rawContent: "FortlevEnergia 02/12",
        description: "FortlevEnergia 02/12",
        amount: 150,
        date: "2026-01-15",
      },
    };

    const hashA = buildImportHash(base);
    const hashB = buildImportHash({
      ...base,
      line: { ...base.line, description: "FortlevEnergia 03/12", rawContent: "FortlevEnergia 03/12" },
    });

    expect(hashA).not.toBe(hashB);
  });

  it("gera mesmo hash para mesma parcela reimportada", () => {
    const params = {
      userId: "user-1",
      importType: "FATURA_CARTAO" as const,
      sourceFileName: "fatura.pdf",
      cardId: "card-1",
      line: {
        rawContent: "FortlevEnergia 02/12",
        description: "FortlevEnergia 02/12",
        amount: 150,
        date: "2026-01-15",
      },
    };

    expect(buildImportHash(params)).toBe(buildImportHash(params));
  });
});
