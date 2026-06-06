import type { FinancialOcrProvider } from "../../domain/ports/financial-ocr-provider.port";
import { BasicFinancialOcrProvider } from "./basic-financial-ocr.provider";
import { HybridFinancialOcrProvider } from "./hybrid-financial-ocr.provider";
import { PaddleOcrHttpProvider } from "./paddle-ocr-http.provider";

export function createFinancialOcrProvider(): FinancialOcrProvider {
  const mode = (process.env.OCR_PROVIDER ?? "").trim().toLowerCase();
  const basic = new BasicFinancialOcrProvider();

  if (mode === "paddle") {
    const serviceUrl = process.env.OCR_SERVICE_URL?.trim() || "http://localhost:8008";
    const paddle = new PaddleOcrHttpProvider(serviceUrl);
    return new HybridFinancialOcrProvider(basic, paddle);
  }

  return basic;
}

export function isPaddleOcrEnabled(): boolean {
  return (process.env.OCR_PROVIDER ?? "").trim().toLowerCase() === "paddle";
}
