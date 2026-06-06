import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildStatementLayoutFingerprint } from "../domain/services/statement-layout-fingerprint.service";

const FIXTURES = join(process.cwd(), "tests", "fixtures", "statement-layout-training");

describe("buildStatementLayoutFingerprint", () => {
  it("detecta cabeçalho CSV após preâmbulo do extrato", () => {
    const content = readFileSync(join(FIXTURES, "novobanco-extrato-v1.csv"), "utf-8");
    const fp = buildStatementLayoutFingerprint({ content, fileFormat: "CSV" });
    expect(fp.columnNames).toEqual(["Data", "Histórico", "Débito", "Crédito", "Saldo"]);
    expect(fp.bankName).toBe("Novo Banco");
  });

  it("diferencia colunas entre layouts PF e PJ", () => {
    const pf = readFileSync(join(FIXTURES, "novobanco-extrato-v1.csv"), "utf-8");
    const pj = readFileSync(join(FIXTURES, "novobanco-extrato-v3-layout-diferente.csv"), "utf-8");
    const fpPf = buildStatementLayoutFingerprint({ content: pf, fileFormat: "CSV" });
    const fpPj = buildStatementLayoutFingerprint({ content: pj, fileFormat: "CSV" });
    expect(fpPf.columnNames).not.toEqual(fpPj.columnNames);
    expect(fpPj.columnNames).toContain("dt_lancamento");
  });
});
