import { beforeEach, describe, expect, it, vi } from "vitest";
import { parsePdf } from "../pdf-parser";
import { PdfParseError } from "../pdf-import-errors";

const getDocumentProxyMock = vi.fn();
const extractTextMock = vi.fn();

// O parser usa `unpdf` (build serverless do PDF.js). Mockamos essa API.
vi.mock("unpdf", () => ({
  getDocumentProxy: (...args: unknown[]) => getDocumentProxyMock(...args),
  extractText: (...args: unknown[]) => extractTextMock(...args),
}));

describe("parsePdf — suporte a senhas PDF (unpdf)", () => {
  beforeEach(() => {
    getDocumentProxyMock.mockReset();
    extractTextMock.mockReset();
  });

  it("processa PDF sem senha e retorna texto", async () => {
    getDocumentProxyMock.mockResolvedValue({ __pdf: true });
    extractTextMock.mockResolvedValue({ text: "05/05/2026 Compra 35,90" });

    const text = await parsePdf(Buffer.from("%PDF-mock"), {});
    expect(text).toContain("05/05/2026");
    expect(getDocumentProxyMock).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.objectContaining({ password: undefined }),
    );
    expect(extractTextMock).toHaveBeenCalledWith({ __pdf: true }, { mergePages: true });
  });

  it("repassa senha ao unpdf quando informada", async () => {
    getDocumentProxyMock.mockResolvedValue({ __pdf: true });
    extractTextMock.mockResolvedValue({ text: "Fatura cartão" });

    await parsePdf(Buffer.from("%PDF-mock"), { pdfPassword: "1234" });
    expect(getDocumentProxyMock).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.objectContaining({ password: "1234" }),
    );
  });

  it("lança PDF_PASSWORD_REQUIRED quando PDF exige senha e nenhuma foi enviada", async () => {
    getDocumentProxyMock.mockRejectedValue(
      Object.assign(new Error("Password required"), { name: "PasswordException", code: 1 }),
    );

    await expect(parsePdf(Buffer.from("%PDF-protegido"))).rejects.toMatchObject({
      code: "PDF_PASSWORD_REQUIRED",
    });
  });

  it("lança PDF_INVALID_PASSWORD quando a senha informada está incorreta", async () => {
    getDocumentProxyMock.mockRejectedValue(
      Object.assign(new Error("Incorrect password"), { name: "PasswordException", code: 2 }),
    );

    await expect(parsePdf(Buffer.from("%PDF-protegido"), { pdfPassword: "errada" })).rejects.toMatchObject({
      code: "PDF_INVALID_PASSWORD",
    });
  });

  it("lança PDF_PARSE_ERROR para falhas genéricas", async () => {
    getDocumentProxyMock.mockRejectedValue(new Error("Invalid PDF structure"));

    await expect(parsePdf(Buffer.from("not-a-pdf"))).rejects.toMatchObject({
      code: "PDF_PARSE_ERROR",
    });
    getDocumentProxyMock.mockRejectedValue(new Error("Invalid PDF structure"));
    await expect(parsePdf(Buffer.from("not-a-pdf"))).rejects.toBeInstanceOf(PdfParseError);
  });
});
