import { beforeEach, describe, expect, it, vi } from "vitest";
import { parsePdf } from "../pdf-parser";
import { PdfParseError } from "../pdf-import-errors";

const getDocumentMock = vi.fn();

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  getDocument: (...args: unknown[]) => getDocumentMock(...args),
}));

function mockPdfDocument(textByPage: string[]) {
  getDocumentMock.mockReturnValue({
    promise: Promise.resolve({
      numPages: textByPage.length,
      getPage: async (pageNumber: number) => ({
        getTextContent: async () => ({
          items: [{ str: textByPage[pageNumber - 1] ?? "" }],
        }),
      }),
      destroy: async () => undefined,
    }),
  });
}

describe("parsePdf — suporte a senhas PDF", () => {
  beforeEach(() => {
    getDocumentMock.mockReset();
  });

  it("processa PDF sem senha e retorna texto", async () => {
    mockPdfDocument(["05/05/2026 Compra 35,90"]);

    const text = await parsePdf(Buffer.from("%PDF-mock"), {});
    expect(text).toContain("05/05/2026");
    expect(getDocumentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        password: undefined,
        useWorkerFetch: false,
        isEvalSupported: false,
      }),
    );
  });

  it("repassa senha ao PDF.js quando informada", async () => {
    mockPdfDocument(["Fatura cartão"]);

    await parsePdf(Buffer.from("%PDF-mock"), { pdfPassword: "1234" });
    expect(getDocumentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        password: "1234",
      }),
    );
  });

  it("lança PDF_PASSWORD_REQUIRED quando PDF exige senha e nenhuma foi enviada", async () => {
    getDocumentMock.mockImplementation(() => ({
      promise: (async () => {
        throw Object.assign(new Error("Password required"), { name: "PasswordException", code: 1 });
      })(),
    }));

    await expect(parsePdf(Buffer.from("%PDF-protegido"))).rejects.toMatchObject({
      code: "PDF_PASSWORD_REQUIRED",
    });
  });

  it("lança PDF_INVALID_PASSWORD quando a senha informada está incorreta", async () => {
    getDocumentMock.mockImplementation(() => ({
      promise: (async () => {
        throw Object.assign(new Error("Incorrect password"), { name: "PasswordException", code: 2 });
      })(),
    }));

    await expect(parsePdf(Buffer.from("%PDF-protegido"), { pdfPassword: "errada" })).rejects.toMatchObject(
      {
        code: "PDF_INVALID_PASSWORD",
      },
    );
  });

  it("lança PDF_PARSE_ERROR para falhas genéricas", async () => {
    getDocumentMock.mockImplementation(() => ({
      promise: (async () => {
        throw new Error("corrupt pdf");
      })(),
    }));

    await expect(parsePdf(Buffer.from("not-a-pdf"))).rejects.toMatchObject({
      code: "PDF_PARSE_ERROR",
    });
    await expect(parsePdf(Buffer.from("not-a-pdf"))).rejects.toBeInstanceOf(PdfParseError);
  });
});
