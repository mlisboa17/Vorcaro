import { describe, expect, it } from "vitest";
import { join } from "node:path";
import {
  resolveBankProfile,
  resolveBankStatement,
  runBankStatementHomologation,
  assertHomologationTarget,
} from "@/lib/bank-parsers";

describe("Sprint 15.2.1 — BankStatementProfileResolver", () => {
  it("detecta PF por CPF/titular", () => {
    expect(resolveBankProfile("Titular: João\nCPF: 123.456.789-00")).toBe("PF");
  });

  it("detecta PJ por CNPJ/razão social", () => {
    expect(resolveBankProfile("Razão Social: Empresa X\nCNPJ: 12.345.678/0001-90")).toBe("PJ");
  });

  it("PF não vira PJ por 'Empresa' em linha de TED", () => {
    expect(
      resolveBankProfile(`
Bradesco
Extrato de Conta Corrente
Titular: JOAO
CPF: 987.654.321-00
03/06/2026 TED ENVIADA Empresa XYZ 200,00
`),
    ).toBe("PF");
  });
});

describe("Sprint 15.2.1 — parsers PF/PJ", () => {
  it("Bradesco PF vs PJ usam parsers distintos", () => {
    const pf = resolveBankStatement(`
Bradesco
Titular: João
CPF: 123.456.789-00
Extrato de Conta Corrente
03/06/2026 PIX RECEBIDO A 123456 0,00 100,00 100,00
04/06/2026 TED ENVIADA B 654321 50,00 0,00 50,00
`);
    expect(pf.parser?.profile).toBe("PF");
    expect(pf.statement.profile).toBe("PF");

    const pj = resolveBankStatement(`
Bradesco
Extrato Empresarial
Razão Social: Empresa LTDA
CNPJ: 12.345.678/0001-90
03/06/2026 PIX RECEBIDO A 123456 0,00 500,00 500,00
04/06/2026 TED ENVIADA B 654321 200,00 0,00 300,00
`);
    expect(pj.parser?.profile).toBe("PJ");
    expect(pj.statement.profile).toBe("PJ");
  });

  it("Inter Empresas identifica PJ", () => {
    const result = resolveBankStatement(`
Banco Inter
Inter Empresas
Extrato de movimentações
CNPJ: 11.999.888/0001-77
03/06/2026 PIX RECEBIDO Cliente 100,00
04/06/2026 TED ENVIADA Fornecedor 50,00
`);
    expect(result.parser?.bankId).toBe("inter");
    expect(result.statement.profile).toBe("PJ");
  });
});

describe("Sprint 15.2.1 — homologação fixtures", () => {
  const fixturesRoot = join(process.cwd(), "tests", "fixtures", "bank-statements");

  it("taxa de sucesso >= 90% na biblioteca sintética 15.2.1", () => {
    const report = runBankStatementHomologation(fixturesRoot);
    expect(report.totalFixtures).toBeGreaterThanOrEqual(16);
    assertHomologationTarget(report, 90);
  });

  it("cada banco P1 PF/PJ possui ao menos um fixture", () => {
    const report = runBankStatementHomologation(fixturesRoot);
    for (const bankId of ["bb", "bradesco", "itau", "santander", "caixa", "sicredi", "sicoob", "inter"]) {
      expect(report.byBankProfile.some((r) => r.bankId === bankId && r.profile === "PF")).toBe(true);
      expect(report.byBankProfile.some((r) => r.bankId === bankId && r.profile === "PJ")).toBe(true);
    }
  });
});
