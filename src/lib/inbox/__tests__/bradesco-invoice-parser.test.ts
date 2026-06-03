import { describe, expect, it } from "vitest";
import { linesFromPdfText } from "../financial-file-import-pdf";
import {
  countBradescoInstallments,
  extractBradescoInvoiceSummary,
  normalizeBradescoDescription,
  parseBradescoInvoiceText,
} from "../bradesco-invoice-parser";

const BRADESCO_FIXTURE = `
BRADESCO CARTOES
Fatura Visa Platinum
Total para proximas faturas R$ 1.234,56
Valor da fatura R$ 5.678,90
Limite utilizado R$ 12.345,67

15/05 BLU PRA DORMIR C05/05 SAO PAULO 89,90
16/05 FortlevEnergia 02/12 CURITIBA 150,00
17/05 OneHeal01/02 200,00
18/05 PG BUZZCRUSH MARKETI01/12 SP 99,99
19/05 MERCADO LIVRE 11/12 45,50
`;

describe("bradesco-invoice-parser", () => {
  it("normaliza descrição com parcela colada e prefixo C", () => {
    expect(normalizeBradescoDescription("BLU PRA DORMIR C05/05")).toEqual({
      description: "BLU PRA DORMIR",
      installment: 5,
      totalInstallments: 5,
    });

    expect(normalizeBradescoDescription("FortlevEnergia 02/12")).toEqual({
      description: "Fortlev Energia",
      installment: 2,
      totalInstallments: 12,
    });

    expect(normalizeBradescoDescription("OneHeal01/02")).toEqual({
      description: "One Heal",
      installment: 1,
      totalInstallments: 2,
    });

    expect(normalizeBradescoDescription("PG BUZZCRUSH MARKETI01/12")).toEqual({
      description: "PG BUZZCRUSH MARKETI",
      installment: 1,
      totalInstallments: 12,
    });
  });

  it("extrai totais da fatura", () => {
    const summary = extractBradescoInvoiceSummary(BRADESCO_FIXTURE);
    expect(summary.totalProximasFaturas).toBe(1234.56);
    expect(summary.valorFatura).toBe(5678.9);
    expect(summary.limiteUtilizado).toBe(12345.67);
  });

  it("parseia lançamentos com data, valor, cidade e parcelas", () => {
    const { lines } = parseBradescoInvoiceText(BRADESCO_FIXTURE, "fatura.pdf");

    expect(lines).toHaveLength(5);
    expect(lines[0]).toMatchObject({
      description: "BLU PRA DORMIR",
      installment: 5,
      totalInstallments: 5,
      city: "SAO PAULO",
      amount: 89.9,
      date: expect.stringMatching(/^\d{4}-05-15$/),
    });
    expect(lines[1]).toMatchObject({
      description: "Fortlev Energia",
      installment: 2,
      totalInstallments: 12,
      city: "CURITIBA",
      amount: 150,
    });
    expect(lines[2]).toMatchObject({
      description: "One Heal",
      installment: 1,
      totalInstallments: 2,
      amount: 200,
    });
  });

  it("integração linesFromPdfText usa parser Bradesco sem afetar outros bancos", () => {
    const beforeGeneric = linesFromPdfText(
      "NUBANK\n15/06/2026 Compra 10,00",
      "nubank.pdf",
    );
    expect(beforeGeneric[0]?.description).toContain("15/06/2026");

    const afterBradesco = linesFromPdfText(BRADESCO_FIXTURE, "bradesco.pdf");
    expect(countBradescoInstallments(afterBradesco)).toBe(5);
    expect(afterBradesco[0]?.installment).toBe(5);
  });
});

describe("bradesco — antes vs depois (relatório)", () => {
  it("compara extração genérica vs Bradesco no fixture da fatura", () => {
    const genericLines = BRADESCO_FIXTURE.replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 20)
      .map((rawContent) => ({
        rawContent,
        description: rawContent.replace(/\s+/g, " ").trim().slice(0, 140),
      }));

    const bradesco = parseBradescoInvoiceText(BRADESCO_FIXTURE, "fatura.pdf");

    const antes = genericLines.filter((l) => /\/\d{2}/.test(l.description ?? ""));
    const depois = bradesco.lines;

    expect(antes.length).toBeGreaterThan(0);
    expect(depois.length).toBe(5);
    expect(countBradescoInstallments(depois)).toBe(5);
    expect(
      depois.every((l) => !/\b\d{1,2}\/\d{1,2}\b/.test(l.description ?? "")),
    ).toBe(true);

    // eslint-disable-next-line no-console -- relatório solicitado no prompt
    console.log(
      JSON.stringify(
        {
          antes: {
            lancamentos: antes.length,
            parcelamentosIdentificados: 0,
            exemplos: antes.slice(0, 3).map((l) => l.description),
          },
          depois: {
            lancamentosNormalizados: depois.length,
            parcelamentosIdentificados: countBradescoInstallments(depois),
            resumoFatura: bradesco.summary,
            exemplos: depois.map((l) => ({
              descricao: l.description,
              parcela: l.installment,
              total: l.totalInstallments,
              cidade: l.city,
              valor: l.amount,
            })),
          },
        },
        null,
        2,
      ),
    );
  });
});
