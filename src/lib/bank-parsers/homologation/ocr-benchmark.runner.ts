import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { resolveBankStatement } from "../bank-statement-parser-resolver";
import {
  detectBankLayoutSource,
  inferRequiresOcr,
} from "./bank-layout-source.detector";
import { isHomologationFixtureFile, loadFixtureContent } from "./bank-fixture-loader";
import type { OcrBenchmarkReport, OcrBenchmarkRow } from "./bank-statement-homologation.types";

type Scenario = OcrBenchmarkRow["scenario"];

function inferScenario(relativePath: string, text: string): Scenario {
  const lower = relativePath.toLowerCase();
  if (lower.includes("foto") || lower.includes("photo")) return "PHOTO_RECEIPT";
  if (lower.includes("pix") || lower.includes("comprovante")) return "PIX_PRINT";
  if (lower.includes("scan") || lower.includes("ocr") || text.includes("[ocr")) return "SCANNED";
  return "NATIVE_PDF";
}

function walkSamples(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walkSamples(full, acc);
    else if (isHomologationFixtureFile(entry)) acc.push(full);
  }
  return acc;
}

export async function runOcrBenchmark(fixturesRoot: string): Promise<OcrBenchmarkReport> {
  const sampleRoot = join(fixturesRoot, "_samples");
  const files = walkSamples(sampleRoot);
  const rows: OcrBenchmarkRow[] = [];

  for (const file of files) {
    const loaded = await loadFixtureContent(file);
    const text = loaded.text || readFileSync(file, "utf8");
    const relativePath = relative(fixturesRoot, file).replace(/\\/g, "/");
    const source = detectBankLayoutSource(text);
    const requiresOcr = inferRequiresOcr(text, source);
    const result = text.trim().length > 0 ? resolveBankStatement(text) : null;
    const ocrFallbackUsed = requiresOcr || /fallback/i.test(text);

    rows.push({
      fileName: relativePath,
      scenario: inferScenario(relativePath, text),
      extractionMs: loaded.extractionMs,
      textLength: text.length,
      requiresOcr,
      ocrFallbackUsed,
      confidence: result?.statement.confidence ?? null,
      notes: requiresOcr ? ["Pipeline OCR recomendado"] : ["Texto nativo suficiente"],
    });
  }

  return { generatedAt: new Date().toISOString(), rows };
}
