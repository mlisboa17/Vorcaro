import { describe, expect, it } from "vitest";
import {
  detectBankLayoutDocumentType,
  detectBankLayoutSource,
  inferRequiresOcr,
} from "@/lib/bank-parsers/homologation/bank-layout-source.detector";
import { generateLargeBankStatement } from "@/lib/bank-parsers/homologation/large-statement.generator";
import { runRealPdfHomologation } from "@/lib/bank-parsers/homologation/real-pdf-homologation.runner";
import { runOcrBenchmark } from "@/lib/bank-parsers/homologation/ocr-benchmark.runner";
import { resolveBankStatement } from "@/lib/bank-parsers";
import {
  extractInstallmentPurchasesFromText,
} from "@/modules/financial-documents/domain/services/card-invoice-installment-parser.service";
import { join } from "node:path";

describe("Sprint 15.2.2 — BankLayoutSource", () => {
  it("detecta WEB por internet banking", () => {
    expect(detectBankLayoutSource("Bradesco\nInternet Banking\nExtrato")).toBe("WEB");
  });

  it("detecta ANDROID por app", () => {
    expect(detectBankLayoutSource("PagBank\nExportado pelo app Android")).toBe("ANDROID");
  });

  it("detecta IOS por iPhone", () => {
    expect(detectBankLayoutSource("Comprovante PIX\nApp iPhone")).toBe("IOS");
  });

  it("detecta SCANNED por marcador OCR", () => {
    expect(detectBankLayoutSource("[ocr fallback] texto curto")).toBe("SCANNED");
  });

  it("classifica EXTRATO vs PIX", () => {
    expect(detectBankLayoutDocumentType("Extrato de Conta Corrente\nSaldo anterior")).toBe("EXTRATO");
    expect(detectBankLayoutDocumentType("Comprovante PIX enviado\nValor R$ 10")).toBe("PIX");
  });

  it("inferRequiresOcr para texto curto", () => {
    expect(inferRequiresOcr("abc", "UNKNOWN")).toBe(true);
    expect(inferRequiresOcr("Extrato longo ".repeat(20), "WEB")).toBe(false);
  });
});

describe("Sprint 15.2.2 — parcelamentos", () => {
  it("detecta 2/12, 3/10, 4/24 e 5/24", () => {
    const p212 = extractInstallmentPurchasesFromText("03/06 LOJA ABC C02/12 SAO PAULO 120,00");
    expect(p212[0]?.currentInstallment).toBe(2);
    expect(p212[0]?.totalInstallments).toBe(12);

    const p310 = extractInstallmentPurchasesFromText("04/06 MERCADO C03/10 CURITIBA 89,90");
    expect(p310[0]?.currentInstallment).toBe(3);
    expect(p310[0]?.totalInstallments).toBe(10);

    const p424 = extractInstallmentPurchasesFromText("05/06 POSTO XYZ 04/24 250,00");
    expect(p424[0]?.currentInstallment).toBe(4);
    expect(p424[0]?.totalInstallments).toBe(24);

    const p524 = extractInstallmentPurchasesFromText("06/06 LOJA DEF 05/24 BELO HORIZONTE 199,00");
    expect(p524[0]?.currentInstallment).toBe(5);
    expect(p524[0]?.totalInstallments).toBe(24);
  });
});

describe("Sprint 15.2.2 — extratos grandes", () => {
  it.each([100, 300, 1000])("parser extrai %i linhas em tempo aceitável", (lineCount) => {
    const text = generateLargeBankStatement(lineCount);
    const started = performance.now();
    const result = resolveBankStatement(text);
    const elapsed = performance.now() - started;

    expect(result.statement.transactions.length).toBeGreaterThanOrEqual(lineCount - 10);
    expect(elapsed).toBeLessThan(lineCount <= 300 ? 500 : 3000);
  });
});

describe("Sprint 15.2.2 — homologação real/", () => {
  const fixturesRoot = join(process.cwd(), "tests", "fixtures", "bank-statements", "real");

  it("executa runner async com taxa >= 90% na massa bootstrap", async () => {
    const report = await runRealPdfHomologation(fixturesRoot);
    if (report.totalFixtures === 0) {
      expect(report.totalFixtures).toBeGreaterThan(0);
      return;
    }
    expect(report.successRate).toBeGreaterThanOrEqual(90);
    expect(report.rows.every((r) => r.source)).toBe(true);
  });

  it("OCR benchmark gera linhas para _samples", async () => {
    const ocr = await runOcrBenchmark(fixturesRoot);
    expect(ocr.rows.length).toBeGreaterThanOrEqual(1);
  });

  it("gate 15.2.2 ainda não satisfeito sem PDFs reais suficientes", async () => {
    const report = await runRealPdfHomologation(fixturesRoot);
    if (report.realPdfCount < 50) {
      expect(report.gateCriteria.readyForSprint153).toBe(false);
    }
  });
});
