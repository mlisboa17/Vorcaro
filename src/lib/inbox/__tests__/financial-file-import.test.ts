import { describe, expect, it } from "vitest";
import { importPreviewLineSchema } from "@/modules/financial-inbox/domain/schemas/financial-import-api.schema";
import { parseCsvBankStatement, parseOfxBankStatement } from "../financial-file-import";

describe("financial file import parsers (mínimo)", () => {
  it("parseia CSV básico e preserva rawContent", () => {
    const csv = Buffer.from("05/05/2026;Almoço;35,90\n2026-05-06;Uber;-12.50\n");
    const items = parseCsvBankStatement(csv);

    expect(items.length).toBe(2);
    expect(items[0]?.date).toBe("2026-05-05");
    expect(items[0]?.amount).toBe(35.9);
    expect(items[0]?.rawContent).toContain("Almoço");
  });

  it("parseia OFX extraindo STMTTRN + FITID", () => {
    const ofx = Buffer.from(
      [
        "OFXHEADER:100",
        "<STMTTRN>",
        "<DTPOSTED>20260601120000.000[-03:BRST]",
        "<TRNAMT>-123.45",
        "<FITID>abc-1",
        "<NAME>TESTE",
        "<MEMO>COMPRA CARTAO",
        "</STMTTRN>",
      ].join("\n"),
    );

    const items = parseOfxBankStatement(ofx);
    expect(items.length).toBe(1);
    expect(items[0]?.externalId).toBe("abc-1");
    expect(items[0]?.date).toBe("2026-06-01");
    expect(items[0]?.amount).toBe(-123.45);
  });

  it("schema de preview aceita city do parser Bradesco", () => {
    const parsed = importPreviewLineSchema.safeParse({
      lineIndex: 0,
      rawContent: "OUTBACK SAO PAULO 120,00",
      importHash: "abc",
      isDuplicate: false,
      city: "SAO PAULO",
      installment: 2,
      totalInstallments: 12,
    });
    expect(parsed.success).toBe(true);
  });
});

