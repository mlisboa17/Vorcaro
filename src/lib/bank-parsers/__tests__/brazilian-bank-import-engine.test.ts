import { describe, expect, it } from "vitest";
import {
  ALL_BANK_PARSERS,
  BankStatementParserResolver,
  buildBankStatementLineFingerprint,
  normalizeDescriptionForFingerprint,
  resolveBankStatement,
} from "@/lib/bank-parsers";
import { analyzeFinancialDocumentText } from "@/modules/financial-documents/domain/services/financial-document-import-analyzer.service";
import { formatTelegramBankStatementBatchSummary } from "@/modules/financial-documents/application/services/telegram-document-summary.formatter";
import { FinancialDocumentLinesConfirmService } from "@/modules/financial-documents/application/services/financial-document-lines-confirm.service";

const FIXTURES = {
  bb: `
BANCO DO BRASIL
Agência: 1234-5
Conta Corrente: 56789-0
Período de 01/06/2026 a 30/06/2026
Extrato de Conta Corrente
Saldo anterior R$ 2.000,00
03/06/2026 PIX RECEBIDO Cliente A 1001 0,00 300,00 2.300,00
04/06/2026 TED ENVIADA Fornecedor B 1002 150,00 0,00 2.150,00
05/06/2026 TARIFA MANUTENCAO 1003 12,50 0,00 2.137,50
`,
  bradesco: `
Bradesco
Extrato de Conta Corrente
Agência: 4321 Conta: 98765-4
03/06/2026 PIX RECEBIDO João 123456 0,00 500,00 1.500,00
04/06/2026 TED ENVIADA Empresa 987654 200,00 0,00 1.300,00
`,
  itau: `
Itaú Unibanco
Extrato bancário
Agência 1234 Conta Corrente 56789-0
03/06/2026 PIX ENVIADO Loja 111 50,00 0,00 950,00
04/06/2026 DOC RECEBIDO Cliente 222 0,00 100,00 1.050,00
`,
  santander: `
Santander
Conta Corrente
Agência 0001 Conta 12345-6
03/06/2026 BOLETO PAGO Concessionaria 333 89,90 0,00 910,10
04/06/2026 PIX RECEBIDO Transferencia 444 0,00 200,00 1.110,10
`,
  nubank: `
Nu Pagamentos S.A.
Nubank
Conta: 00012345-6
Extrato de movimentações
03/06/2026 Transferência recebida PIX Maria 100,00
04/06/2026 Pagamento boleto Energia 150,00
`,
  inter: `
Banco Inter
Extrato de Conta Corrente
Agência 0001 Conta 99999-9
03/06/2026 PIX RECEBIDO Cliente 100,00
04/06/2026 PIX ENVIADO Mercado 45,00
`,
  c6: `
C6 Bank
Extrato bancário
Conta Corrente 88888-8
03/06/2026 PIX RECEBIDO Salario 3.500,00
04/06/2026 COMPRA CARTAO LOJA 120,00
`,
  pagbank: `
PagBank PagSeguro
Extrato de movimentações
03/06/2026 PIX RECEBIDO Venda 250,00
04/06/2026 TRANSFERENCIA ENVIADA 80,00
`,
} as const;

describe("Sprint 15.2 — resolver automático", () => {
  const resolver = new BankStatementParserResolver();

  it.each([
    ["bb", "Banco do Brasil"],
    ["bradesco", "Bradesco"],
    ["itau", "Itaú"],
    ["santander", "Santander"],
    ["nubank", "Nubank"],
    ["inter", "Banco Inter"],
    ["c6", "C6 Bank"],
    ["pagbank", "PagBank"],
  ] as const)("identifica %s", (key, bankName) => {
    const text = FIXTURES[key];
    const parser = resolver.identifyParser(text);
    expect(parser?.bankName).toBe(bankName);
  });

  it("prioridade 1 possui 8 bancos com parsers PF/PJ", () => {
    const bankIds = new Set(
      ALL_BANK_PARSERS.filter((p) =>
        ["bb", "bradesco", "itau", "santander", "nubank", "inter", "c6", "pagbank"].includes(p.bankId),
      ).map((p) => p.bankId),
    );
    expect(bankIds.size).toBe(8);
  });
});

describe("Sprint 15.2 — extração de movimentações", () => {
  it.each(Object.entries(FIXTURES))("%s extrai múltiplas linhas com débito/crédito", (_key, text) => {
    const { statement } = resolveBankStatement(text);
    expect(statement.transactions.length).toBeGreaterThanOrEqual(2);
    expect(statement.transactions.some((tx) => tx.direction === "INCOME")).toBe(true);
    expect(statement.transactions.some((tx) => tx.direction === "EXPENSE")).toBe(true);
  });

  it("classifica PIX, TED, boleto e tarifa quando possível", () => {
    const { statement } = resolveBankStatement(FIXTURES.bb);
    const methods = statement.transactions.map((tx) => tx.method);
    expect(methods).toContain("PIX");
    expect(methods).toContain("TRANSFERENCIA");
    expect(methods.some((m) => m === "TARIFA" || m === "OUTROS")).toBe(true);
  });

  it("integração analyzer gera revisão em lote", () => {
    const analysis = analyzeFinancialDocumentText(FIXTURES.itau, { userId: "user-1" });
    expect(analysis.documentKind).toBe("BANK_STATEMENT");
    expect(analysis.batchReviewRequired).toBe(true);
    expect(analysis.bank).toBe("Itaú");
    expect(analysis.bankStatementTransactions[0]?.fingerprint).toBeTruthy();
  });
});

describe("Sprint 15.2 — fingerprint por linha", () => {
  it("fingerprint estável por usuário/banco/conta/data/valor/descrição", () => {
    const norm = normalizeDescriptionForFingerprint("PIX Recebido Cliente A");
    const fp1 = buildBankStatementLineFingerprint({
      userId: "u1",
      bank: "Banco do Brasil",
      account: "56789-0",
      date: "2026-06-03",
      amount: 300,
      normalizedDescription: norm,
    });
    const fp2 = buildBankStatementLineFingerprint({
      userId: "u1",
      bank: "Banco do Brasil",
      account: "56789-0",
      date: "2026-06-03",
      amount: 300,
      normalizedDescription: norm,
    });
    expect(fp1).toBe(fp2);
  });
});

describe("Sprint 15.2 — Telegram e confirmação humana", () => {
  it("Telegram direciona revisão para dashboard", () => {
    const text = formatTelegramBankStatementBatchSummary({
      transactionCount: 18,
      bank: "Nubank",
    });
    expect(text).toContain("18 movimentações");
    expect(text).toContain("/dashboard/import/review");
  });

  it("cross-tenant getLines retorna null", async () => {
    const service = new FinancialDocumentLinesConfirmService({} as never);
    (service as unknown as { repo: { findDocumentById: () => Promise<null> } }).repo = {
      findDocumentById: async () => null,
    };
    expect(await service.getLines("u1", "doc-x")).toBeNull();
  });
});

describe("Sprint 15.2 — parser genérico fallback", () => {
  it("aplica fallback quando banco não identificado", () => {
    const text = `
Extrato de Conta Corrente
Saldo anterior R$ 100,00
03/06/2026 PAGAMENTO DIVERSOS 50,00
04/06/2026 RECEBIMENTO CLIENTE 200,00
05/06/2026 TARIFA 5,00
`;
    const { usedGenericFallback, statement } = resolveBankStatement(text);
    expect(usedGenericFallback).toBe(true);
    expect(statement.transactions.length).toBeGreaterThanOrEqual(2);
    expect(statement.warnings.length).toBeGreaterThan(0);
  });
});
