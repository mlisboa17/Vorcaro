import { describe, expect, it } from "vitest";
import { generateLargeBankStatement } from "@/lib/bank-parsers/homologation/large-statement.generator";
import {
  parseBradescoBrazilianAmount,
  parseBradescoStatementFull,
} from "@/lib/inbox/bradesco-statement-line-parser";
import { parseBradescoBankStatementWithStatus } from "@/lib/inbox/bradesco-bank-statement-parser";

const BRADESCO_PJ = `
Bradesco
Extrato Empresarial
Razão Social: COMERCIO BRASIL ME
CNPJ: 98.765.432/0001-10
Agência: 1111 Conta Empresarial: 22222-3
Saldo anterior R$ 8.000,00

Data Histórico Documento Débito Crédito Saldo
03/06/2026 PIX RECEBIDO Venda 123456 0,00 1.200,00 9.200,00
04/06/2026 DOC ENVIADO Fornecedor 987654 450,00 0,00 8.750,00
05/06/2026 TED ENVIADA Folha 555666 3.000,00 0,00 5.750,00
`;

describe("Bradesco PJ — parser robusto", () => {
  it("reconhece extrato empresarial PJ", () => {
    const lines = parseBradescoBankStatementWithStatus(BRADESCO_PJ);
    expect(lines.filter((l) => l.parseStatus === "RECOGNIZED")).toHaveLength(3);
  });

  it("parseia valores com R$, D/C e negativo", () => {
    expect(parseBradescoBrazilianAmount("R$ 1.234,56")).toBe(1234.56);
    expect(parseBradescoBrazilianAmount("-1.234,56")).toBe(-1234.56);
    expect(parseBradescoBrazilianAmount("1.234,56 D")).toBe(1234.56);
    expect(parseBradescoBrazilianAmount("1.234,56 C")).toBe(1234.56);

    const dcLine = parseBradescoBankStatementWithStatus(
      "Bradesco\nExtrato Empresarial\n03/06/2026 PIX RECEBIDO Cliente 1001 1.500,00 C",
    );
    expect(dcLine[0]?.direction).toBe("INCOME");
    expect(dcLine[0]?.amount).toBe(1500);
  });

  it("marca linha sem valor como precisa revisar", () => {
    const lines = parseBradescoBankStatementWithStatus(`
Bradesco
Extrato Empresarial
03/06/2026 PIX RECEBIDO Cliente sem valor claro
`);
    expect(lines[0]?.parseStatus).toBe("NEEDS_REVIEW");
    expect(lines[0]?.reviewMessage).toContain("valor");
    expect(lines[0]?.amount).toBe(0);
  });

  it("ignora cabeçalhos e saldo anterior", () => {
    const result = parseBradescoStatementFull(BRADESCO_PJ);
    expect(result.summary.ignored).toBeGreaterThan(0);
    expect(result.summary.recognized).toBe(3);
  });

  it("une descrição quebrada em várias linhas", () => {
    const lines = parseBradescoBankStatementWithStatus(`
Bradesco
Extrato Empresarial
03/06/2026 PIX RECEBIDO
PAGAMENTO FORNECEDOR ABC LTDA
123456 0,00 2.500,00 10.000,00
`);
    const recognized = lines.find((l) => l.parseStatus === "RECOGNIZED");
    expect(recognized?.description).toMatch(/FORNECEDOR/);
    expect(recognized?.amount).toBe(2500);
  });

  it("processa extrato longo em blocos sem perder lançamentos", () => {
    const text = generateLargeBankStatement(200, "Bradesco");
    const pjText = text.replace(
      "Titular: EMPRESA TESTE LTDA",
      "Extrato Empresarial\nRazão Social: EMPRESA TESTE LTDA",
    );
    const result = parseBradescoStatementFull(pjText);
    expect(result.processedInChunks).toBe(true);
    expect(result.summary.recognized).toBeGreaterThanOrEqual(190);
  });

  it("não descarta linhas não reconhecidas silenciosamente", () => {
    const result = parseBradescoStatementFull(`
Bradesco
Extrato Empresarial
linha estranha sem data nem valor suficiente para ser lançamento
03/06/2026 TED ENVIADA OK 2001 100,00 0,00 900,00
`);
    const statuses = result.lines.map((l) => l.parseStatus);
    expect(statuses).toContain("ERROR");
    expect(statuses).toContain("RECOGNIZED");
  });
});
