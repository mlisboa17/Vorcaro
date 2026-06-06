import { readdirSync, statSync, existsSync } from "node:fs";

import { join, relative } from "node:path";

import { resolveBankStatement } from "../bank-statement-parser-resolver";

import {

  detectBankLayoutDocumentType,

  detectBankLayoutSource,

  inferRequiresOcr,

} from "./bank-layout-source.detector";

import type { BankFixtureMeta } from "./bank-layout.types";

import {

  isHomologationFixtureFile,

  loadFixtureContent,

  type LoadedFixture,

} from "./bank-fixture-loader";

import type {

  BankHomologationReport,

  BankHomologationRow,

  RealPdfHomologationGate,

} from "./bank-statement-homologation.types";



const DEFAULT_GATE: Required<RealPdfHomologationGate> = {

  minRealPdfs: 50,

  minSuccessRate: 95,

};



function walkFixtures(dir: string, acc: string[] = []): string[] {

  if (!existsSync(dir)) return acc;

  for (const entry of readdirSync(dir)) {

    if (entry.startsWith(".")) continue;

    const full = join(dir, entry);

    const stat = statSync(full);

    if (stat.isDirectory()) {

      if (entry === "_samples") continue;

      walkFixtures(full, acc);

    } else if (isHomologationFixtureFile(entry)) {

      acc.push(full);

    }

  }

  return acc;

}



function evaluateLoadedFixture(

  loaded: LoadedFixture,

  fixturesRoot: string,

): BankHomologationRow {

  const relativePath = relative(fixturesRoot, loaded.filePath).replace(/\\/g, "/");

  const meta = loaded.meta;

  const text = loaded.text;

  const result = resolveBankStatement(text);

  const notes: string[] = [];



  const bankId = meta.bankId ?? "unknown";

  const expectedProfile = meta.profile ?? "UNKNOWN";

  const minTx =

    meta.minTransactions ??

    (meta.documentType === "PIX" || meta.documentType === "TED" || meta.documentType === "DOC" ? 0 : 2);



  const source = detectBankLayoutSource(text, meta.source);

  const documentType = detectBankLayoutDocumentType(text, meta.documentType);

  const requiresOcr = meta.passwordProtected

    ? false

    : inferRequiresOcr(text, source) || Boolean(meta.passwordProtected === false && loaded.usedPdfParser && text.trim().length < 80);



  if (loaded.passwordRequired) {

    notes.push("PDF_PASSWORD_REQUIRED");

    return buildRow({

      relativePath,

      meta,

      bankId,

      expectedProfile,

      result,

      notes,

      source,

      documentType,

      requiresOcr,

      loaded,

      success: meta.passwordProtected === true,

    });

  }



  if (loaded.passwordError) {

    notes.push("PDF_INVALID_PASSWORD");

    return buildRow({

      relativePath,

      meta,

      bankId,

      expectedProfile,

      result,

      notes,

      source,

      documentType,

      requiresOcr,

      loaded,

      success: false,

    });

  }



  const bankMatch = result.parser?.bankId === bankId;

  if (!bankMatch) notes.push(`Banco esperado ${bankId}, obtido ${result.parser?.bankId ?? "none"}`);



  const profileMatch =
    expectedProfile === "UNKNOWN" || result.statement.profile === expectedProfile;
  if (!profileMatch) {
    notes.push(
      `Perfil esperado ${expectedProfile}, obtido ${result.statement.profile} (parser ${result.parser?.profile ?? "—"})`,
    );
  }



  if (documentType === "EXTRATO" && result.statement.transactions.length < minTx) {

    notes.push(`Transações ${result.statement.transactions.length} < mínimo ${minTx}`);

  }



  if (result.usedGenericFallback) notes.push("Fallback genérico utilizado");



  const txOk =

    documentType !== "EXTRATO" || result.statement.transactions.length >= minTx;

  const success = bankMatch && profileMatch && txOk && !loaded.passwordError;



  return buildRow({

    relativePath,

    meta,

    bankId,

    expectedProfile,

    result,

    notes,

    source,

    documentType,

    requiresOcr,

    loaded,

    success,

  });

}



function buildRow(input: {

  relativePath: string;

  meta: BankFixtureMeta;

  bankId: string;

  expectedProfile: BankHomologationRow["profile"];

  result: ReturnType<typeof resolveBankStatement>;

  notes: string[];

  source: BankHomologationRow["source"];

  documentType: BankHomologationRow["documentType"];

  requiresOcr: boolean;

  loaded: LoadedFixture;

  success: boolean;

}): BankHomologationRow {

  return {

    bankId: input.bankId,

    bankName: input.result.statement.bank,

    profile: input.expectedProfile,

    fileName: input.relativePath,

    success: input.success,

    detectedBank: input.result.parser?.bankId ?? "generic",

    detectedProfile: input.result.statement.profile,

    transactionCount: input.result.statement.transactions.length,

    confidence: input.result.statement.confidence,

    requiresOcr: input.requiresOcr,

    notes: input.notes,

    source: input.source,

    documentType: input.documentType,

    passwordProtected: Boolean(input.meta.passwordProtected),

    passwordRequired: input.loaded.passwordRequired,

    passwordError: input.loaded.passwordError,

    extractionMs: input.loaded.extractionMs,

    usedPdfParser: input.loaded.usedPdfParser,

    homologationStatus: input.meta.homologationStatus ?? "NAO_HOMOLOGADO",

  };

}



function countRealPdfs(rows: BankHomologationRow[]): number {

  return rows.filter((row) => row.usedPdfParser && !row.fileName.includes("sintetico")).length;

}



export async function runRealPdfHomologation(

  fixturesRoot: string,

  gate: RealPdfHomologationGate = {},

): Promise<BankHomologationReport> {

  const criteria = { ...DEFAULT_GATE, ...gate };

  const files = walkFixtures(fixturesRoot);

  const rows: BankHomologationRow[] = [];



  for (const file of files) {

    const loaded = await loadFixtureContent(file);

    rows.push(evaluateLoadedFixture(loaded, fixturesRoot));

  }



  const successCount = rows.filter((r) => r.success).length;

  const totalFixtures = rows.length;

  const successRate = totalFixtures > 0 ? Math.round((successCount / totalFixtures) * 100) : 0;

  const realPdfCount = countRealPdfs(rows);



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



  const failures = rows

    .filter((r) => !r.success)

    .map((r) => ({

      bankId: r.bankId,

      profile: r.profile,

      fileName: r.fileName,

      notes: r.notes,

    }));



  const realPdfCountMet = realPdfCount >= criteria.minRealPdfs;

  const successRateMet = successRate >= criteria.minSuccessRate;



  return {

    generatedAt: new Date().toISOString(),

    fixturesRoot,

    totalFixtures,

    successCount,

    successRate,

    realPdfCount,

    rows,

    byBankProfile,

    failures,

    gateCriteria: {

      minRealPdfs: criteria.minRealPdfs,

      minSuccessRate: criteria.minSuccessRate,

      realPdfCountMet,

      successRateMet,

      readyForSprint153: realPdfCountMet && successRateMet,

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


