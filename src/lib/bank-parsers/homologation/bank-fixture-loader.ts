import { readFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { parsePdf } from "@/lib/parsers/pdf-parser";
import { PdfParseError } from "@/lib/parsers/pdf-parser";
import type { BankFixtureMeta } from "./bank-layout.types";
import type { BankProfile } from "../bank-statement-parser.types";

const BANK_IDS = new Set([
  "bb",
  "bradesco",
  "itau",
  "santander",
  "caixa",
  "sicredi",
  "sicoob",
  "inter",
  "c6",
  "pagbank",
  "nubank",
]);

export type LoadedFixture = {
  filePath: string;
  text: string;
  meta: BankFixtureMeta;
  extractionMs: number;
  usedPdfParser: boolean;
  passwordRequired: boolean;
  passwordError: boolean;
};

function metaPathFor(filePath: string): string {
  return filePath.replace(/\.(txt|pdf|json)$/i, ".meta.json");
}

function loadMeta(filePath: string): BankFixtureMeta {
  const sidecar = metaPathFor(filePath);
  if (existsSync(sidecar)) {
    try {
      return JSON.parse(readFileSync(sidecar, "utf8")) as BankFixtureMeta;
    } catch {
      return {};
    }
  }

  if (/\.json$/i.test(filePath) && !filePath.endsWith(".meta.json")) {
    try {
      const json = JSON.parse(readFileSync(filePath, "utf8")) as BankFixtureMeta & { text?: string };
      const { text: _t, ...meta } = json;
      return meta;
    } catch {
      return {};
    }
  }

  return {};
}

function inferMetaFromPath(filePath: string, meta: BankFixtureMeta): BankFixtureMeta {
  const parts = filePath.replace(/\\/g, "/").split("/");
  const bankIdx = parts.findIndex((p) => BANK_IDS.has(p));
  if (bankIdx < 0) return meta;

  const bankId = parts[bankIdx]!;
  const profilePart = parts[bankIdx + 1]?.toLowerCase();
  const profile: BankProfile =
    profilePart === "pf" ? "PF" : profilePart === "pj" ? "PJ" : (meta.profile ?? "UNKNOWN");

  return {
    minTransactions: meta.documentType === "PIX" ? 0 : 2,
    ...meta,
    bankId: meta.bankId ?? bankId,
    profile: meta.profile ?? profile,
  };
}

export async function loadFixtureContent(filePath: string): Promise<LoadedFixture> {
  const meta = inferMetaFromPath(filePath, loadMeta(filePath));
  const started = performance.now();
  let text = "";
  let usedPdfParser = false;
  let passwordRequired = false;
  let passwordError = false;

  if (/\.pdf$/i.test(filePath)) {
    usedPdfParser = true;
    const buffer = readFileSync(filePath);
    try {
      text = await parsePdf(buffer, meta.pdfPassword ? { pdfPassword: meta.pdfPassword } : undefined);
    } catch (error) {
      if (error instanceof PdfParseError && error.code === "PDF_PASSWORD_REQUIRED") {
        passwordRequired = true;
        text = "";
      } else if (error instanceof PdfParseError && error.code === "PDF_INVALID_PASSWORD") {
        passwordError = true;
        text = "";
      } else {
        throw error;
      }
    }
  } else if (/\.json$/i.test(filePath) && !filePath.endsWith(".meta.json")) {
    const json = JSON.parse(readFileSync(filePath, "utf8")) as { text?: string };
    text = json.text ?? "";
  } else if (/\.txt$/i.test(filePath)) {
    text = readFileSync(filePath, "utf8");
  } else {
    text = readFileSync(filePath, "utf8");
  }

  const extractionMs = Math.round(performance.now() - started);

  return {
    filePath,
    text,
    meta,
    extractionMs,
    usedPdfParser,
    passwordRequired,
    passwordError,
  };
}

export function isHomologationFixtureFile(name: string): boolean {
  return /\.(txt|pdf|json)$/i.test(name) && !name.endsWith(".meta.json");
}

export function resolveSidecarTextForPdf(pdfPath: string): string | null {
  const txtPath = pdfPath.replace(/\.pdf$/i, ".txt");
  if (existsSync(txtPath)) return readFileSync(txtPath, "utf8");
  return null;
}
