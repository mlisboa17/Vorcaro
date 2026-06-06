import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { resolveBankStatement } from "../bank-statement-parser-resolver";
import { resolveBankProfile } from "../bank-statement-profile-resolver";
import type {
  BankHomologationReport,
  BankHomologationRow,
  HomologationFixtureExpectation,
} from "./bank-statement-homologation.types";
import {
  detectBankLayoutDocumentType,
  detectBankLayoutSource,
  inferRequiresOcr,
} from "./bank-layout-source.detector";

const BANK_ID_ALIASES: Record<string, string> = {
  bb: "bb",
  bradesco: "bradesco",
  itau: "itau",
  santander: "santander",
  caixa: "caixa",
  sicredi: "sicredi",
  sicoob: "sicoob",
  inter: "inter",
  nubank: "nubank",
};

function parseFixtureMeta(relativePath: string): HomologationFixtureExpectation | null {
  const parts = relativePath.replace(/\\/g, "/").split("/");
  const bankIdx = parts.findIndex((p) => BANK_ID_ALIASES[p]);
  if (bankIdx < 0) return null;

  const bankId = parts[bankIdx]!;
  const profilePart = parts[bankIdx + 1]?.toLowerCase();
  const profile =
    profilePart === "pf" ? "PF" : profilePart === "pj" ? "PJ" : ("UNKNOWN" as const);

  return { bankId, profile, minTransactions: 2 };
}

function loadFixtureText(filePath: string): string {
  const raw = readFileSync(filePath, "utf8");
  if (raw.trim().startsWith("{")) {
    try {
      const json = JSON.parse(raw) as { text?: string };
      if (json.text) return json.text;
    } catch {
      /* plain text */
    }
  }
  return raw;
}

function evaluateFixture(
  filePath: string,
  fixturesRoot: string,
  text: string,
): BankHomologationRow {
  const relativePath = relative(fixturesRoot, filePath);
  const meta = parseFixtureMeta(relativePath);
  const fileName = relativePath.replace(/\\/g, "/");
  const result = resolveBankStatement(text);
  const notes: string[] = [];

  const bankId = meta?.bankId ?? "unknown";
  const expectedProfile = meta?.profile ?? "UNKNOWN";
  const minTx = meta?.minTransactions ?? 1;

  const bankMatch = result.parser?.bankId === bankId;
  if (!bankMatch) notes.push(`Banco esperado ${bankId}, obtido ${result.parser?.bankId ?? "none"}`);

  const profileMatch =
    expectedProfile === "UNKNOWN" ||
    result.statement.profile === expectedProfile ||
    result.detectedProfile === expectedProfile;
  if (!profileMatch) {
    notes.push(
      `Perfil esperado ${expectedProfile}, obtido ${result.statement.profile}/${result.detectedProfile}`,
    );
  }

  if (result.statement.transactions.length < minTx) {
    notes.push(`Transações ${result.statement.transactions.length} < mínimo ${minTx}`);
  }

  if (result.usedGenericFallback) notes.push("Fallback genérico utilizado");

  const source = detectBankLayoutSource(text);
  const documentType = detectBankLayoutDocumentType(text);
  const requiresOcr = inferRequiresOcr(text, source);
  const success = bankMatch && profileMatch && result.statement.transactions.length >= minTx;

  return {
    bankId,
    bankName: result.statement.bank,
    profile: expectedProfile,
    fileName,
    success,
    detectedBank: result.parser?.bankId ?? "generic",
    detectedProfile: result.statement.profile,
    transactionCount: result.statement.transactions.length,
    confidence: result.statement.confidence,
    requiresOcr,
    notes,
    source,
    documentType,
    passwordProtected: false,
    passwordRequired: false,
    passwordError: false,
    extractionMs: 0,
    usedPdfParser: false,
    homologationStatus: "PARCIAL",
  };
}

function walkFixtures(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (entry === "real" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walkFixtures(full, acc);
    else if (/\.(txt|pdf)$/i.test(entry)) acc.push(full);
    else if (/\.json$/i.test(entry) && !entry.endsWith(".meta.json")) acc.push(full);
  }
  return acc;
}

export function runBankStatementHomologation(fixturesRoot: string): BankHomologationReport {
  const files = walkFixtures(fixturesRoot);
  const rows: BankHomologationRow[] = files.map((file) => {
    const text = loadFixtureText(file);
    return evaluateFixture(file, fixturesRoot, text);
  });

  const successCount = rows.filter((r) => r.success).length;
  const totalFixtures = rows.length;
  const successRate = totalFixtures > 0 ? Math.round((successCount / totalFixtures) * 100) : 0;

  const groupMap = new Map<string, { pdfs: number; success: number }>();
  for (const row of rows) {
    const key = `${row.bankId}:${row.profile}`;
    const current = groupMap.get(key) ?? { pdfs: 0, success: 0 };
    current.pdfs += 1;
    if (row.success) current.success += 1;
    groupMap.set(key, current);
  }

  const byBankProfile = [...groupMap.entries()].map(([key, value]) => {
    const [bankId, profile] = key.split(":");
    return {
      bankId: bankId!,
      profile: profile as BankHomologationRow["profile"],
      pdfs: value.pdfs,
      success: value.success,
      rate: value.pdfs > 0 ? Math.round((value.success / value.pdfs) * 100) : 0,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    fixturesRoot,
    totalFixtures,
    successCount,
    successRate,
    realPdfCount: 0,
    rows,
    byBankProfile,
    failures: rows.filter((r) => !r.success).map((r) => ({
      bankId: r.bankId,
      profile: r.profile,
      fileName: r.fileName,
      notes: r.notes,
    })),
    gateCriteria: {
      minRealPdfs: 50,
      minSuccessRate: 95,
      realPdfCountMet: false,
      successRateMet: successRate >= 95,
      readyForSprint153: false,
    },
  };
}

export function assertHomologationTarget(report: BankHomologationReport, minRate = 90): void {
  if (report.totalFixtures === 0) return;
  if (report.successRate < minRate) {
    throw new Error(
      `Taxa de homologação ${report.successRate}% abaixo do alvo ${minRate}% (${report.successCount}/${report.totalFixtures})`,
    );
  }
}

export { resolveBankProfile };
