import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { parseImportFile } from "@/lib/inbox/financial-import-pipeline";
import { buildImportLineSummary } from "@/lib/inbox/structured-bank-import.parser";
import { StatementLayoutTrainingService } from "../../application/services/statement-layout-training.service";
import type { StatementLayoutFormat } from "../../domain/types/statement-layout-model.types";
import {
  buildMetricsFromLines,
  detectProblems,
  evaluateRecognitionRate,
} from "./real-bank-homologation.evaluator";
import { formatRealBankHomologMarkdown } from "./real-bank-homologation-report.formatter";
import {
  MINIMUM_REAL_BANKS,
  REAL_BANK_FORMAT_SLOTS,
  type RealBankFileResult,
  type RealBankHomologReport,
  type RealBankHomologResultStatus,
} from "./real-bank-homologation.types";
import { maskFileName } from "./real-bank-privacy.service";

const DEFAULT_BANKS_ROOT = join(process.cwd(), "homologation", "banks");

function guessExtension(fileName: string): "pdf" | "ofx" | "csv" | "xls" | "xlsx" | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".ofx")) return "ofx";
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".xls")) return "xls";
  if (lower.endsWith(".xlsx")) return "xlsx";
  return null;
}

function bankLabelFromFolder(folder: string): string {
  return folder.replace(/_/g, " ");
}

function findSlotFile(bankDir: string, fileNames: string[]): string | null {
  for (const name of fileNames) {
    const full = join(bankDir, name);
    if (existsSync(full)) return full;
  }
  return null;
}

function evaluateMinimumBank(
  bankFolder: string,
  results: RealBankFileResult[],
): { bankFolder: string; status: RealBankHomologResultStatus; detail: string } {
  const bankResults = results.filter((r) => r.bankFolder === bankFolder);
  const available = bankResults.filter((r) => r.availability === "available");

  if (available.length === 0) {
    return {
      bankFolder,
      status: "PENDING",
      detail: "Nenhum arquivo disponível — adicione extratos anonimizados na pasta do banco",
    };
  }

  const failed = available.filter((r) => r.status === "FAILED");
  if (failed.length > 0) {
    return {
      bankFolder,
      status: "FAILED",
      detail: `${failed.length} formato(s) reprovado(s)`,
    };
  }

  const warnings = available.filter((r) => r.status === "WARNING");
  if (warnings.length > 0) {
    return {
      bankFolder,
      status: "WARNING",
      detail: `${warnings.length} formato(s) com WARNING — ajuste fino recomendado`,
    };
  }

  const passed = available.every((r) => r.status === "PASSED");
  return {
    bankFolder,
    status: passed ? "PASSED" : "PENDING",
    detail: passed ? "Todos os formatos disponíveis aprovados" : "Homologação incompleta",
  };
}

async function processFile(input: {
  training: StatementLayoutTrainingService;
  userId: string;
  bankFolder: string;
  bankLabel: string;
  slot: (typeof REAL_BANK_FORMAT_SLOTS)[number];
  filePath: string;
}): Promise<RealBankFileResult> {
  const fileName = input.filePath.split(/[/\\]/).pop() ?? input.filePath;
  const ext = guessExtension(fileName);
  const base: RealBankFileResult = {
    bankFolder: input.bankFolder,
    bankLabel: input.bankLabel,
    formatSlot: input.slot.slot,
    formatLabel: input.slot.label,
    fileName: maskFileName(fileName),
    availability: "available",
    status: "FAILED",
    metrics: null,
    similarity: null,
    similarityTier: null,
    modelId: null,
    modelLabel: null,
    modelVersion: null,
    modelAction: "none",
    problems: [],
    correctionsApplied: [],
    parserError: null,
  };

  if (!ext) {
    return { ...base, parserError: "Extensão não suportada", problems: ["extensão inválida"] };
  }

  try {
    const buffer = readFileSync(input.filePath);
    const parsedLines = await parseImportFile({
      buffer,
      extension: ext,
      fileName,
    });

    const contentSample = [
      fileName,
      buffer.toString("utf-8", 0, Math.min(buffer.length, 12000)),
      ...parsedLines.map((l) => l.rawContent),
    ].join("\n");

    const layoutContext = await input.training.matchForImport({
      userId: input.userId,
      content: contentSample,
      fileName,
      fileFormat: input.slot.format as StatementLayoutFormat,
    });

    const beforeModelId = layoutContext.match.modelId;
    const ensured = await input.training.ensureModelAfterFirstImport({
      userId: input.userId,
      content: contentSample,
      fileName,
      fileFormat: input.slot.format as StatementLayoutFormat,
      match: layoutContext.match,
    });

    const trainedLines = input.training.applyTrainingToInboxLines(parsedLines, {
      match: ensured,
      forceReview: layoutContext.forceReview || ensured.similarityTier !== "HIGH",
    });

    const summary = buildImportLineSummary(trainedLines);
    const metrics = buildMetricsFromLines(parsedLines.length, trainedLines);
    const problems = detectProblems(metrics);
    const status = evaluateRecognitionRate(metrics);

    let modelAction: RealBankFileResult["modelAction"] = "none";
    if (ensured.isNewModel) modelAction = "created";
    else if (ensured.modelId && !beforeModelId) modelAction = "created";
    else if (ensured.modelId) modelAction = ensured.similarityTier === "HIGH" ? "reused" : "approximate";

    if (ensured.modelId) {
      await input.training.markRealImport(input.userId, ensured.modelId);
    }

    return {
      ...base,
      status,
      metrics: {
        ...metrics,
        total: summary.total,
        recognized: summary.recognized,
        needsReview: summary.needsReview,
        ignored: summary.ignored,
        errors: summary.errors,
        recognitionRate:
          summary.total === 0
            ? 0
            : Math.round((summary.recognized / summary.total) * 1000) / 10,
      },
      similarity: ensured.similarityScore,
      similarityTier: ensured.similarityTier,
      modelId: ensured.modelId,
      modelLabel: ensured.layoutLabel,
      modelVersion: ensured.modelVersion,
      modelAction,
      problems,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return {
      ...base,
      parserError: message,
      problems: [`erro no parser: ${message}`],
    };
  }
}

export async function runRealBankHomologation(
  prisma: PrismaClient,
  options: {
    userId?: string;
    banksRoot?: string;
    cleanup?: boolean;
  } = {},
): Promise<RealBankHomologReport> {
  const banksRoot = options.banksRoot ?? DEFAULT_BANKS_ROOT;
  const userId = options.userId ?? `real-bank-homolog-${Date.now()}`;
  const training = new StatementLayoutTrainingService(prisma);

  if (options.cleanup !== false) {
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: `real-bank-homolog-${userId}@logos.local`,
        name: "Real Bank Homolog",
      },
      update: {},
    });
    await prisma.bankStatementLayoutCorrection.deleteMany({ where: { userId } });
    await prisma.bankStatementLayoutModel.deleteMany({ where: { userId } });
  }

  const bankFolders = readdirSync(banksRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const results: RealBankFileResult[] = [];

  for (const bankFolder of bankFolders) {
    const bankDir = join(banksRoot, bankFolder);
    const bankLabel = bankLabelFromFolder(bankFolder);

    for (const slot of REAL_BANK_FORMAT_SLOTS) {
      const filePath = findSlotFile(bankDir, slot.fileNames);
      if (!filePath) {
        results.push({
          bankFolder,
          bankLabel,
          formatSlot: slot.slot,
          formatLabel: slot.label,
          fileName: null,
          availability: "not_available",
          status: "SKIPPED",
          metrics: null,
          similarity: null,
          similarityTier: null,
          modelId: null,
          modelLabel: null,
          modelVersion: null,
          modelAction: "none",
          problems: [],
          correctionsApplied: [],
          parserError: null,
        });
        continue;
      }

      results.push(
        await processFile({
          training,
          userId,
          bankFolder,
          bankLabel,
          slot,
          filePath,
        }),
      );
    }
  }

  const minimumBanks = MINIMUM_REAL_BANKS.map((bankFolder) =>
    evaluateMinimumBank(bankFolder, results),
  );

  const available = results.filter((r) => r.availability === "available");
  const readyForMerge = minimumBanks.every(
    (b) => b.status === "PASSED" || b.status === "WARNING",
  );

  return {
    generatedAt: new Date().toISOString(),
    userId,
    banksRoot,
    results,
    minimumBanks,
    summary: {
      totalSlots: results.length,
      available: available.length,
      notAvailable: results.length - available.length,
      passed: available.filter((r) => r.status === "PASSED").length,
      warning: available.filter((r) => r.status === "WARNING").length,
      failed: available.filter((r) => r.status === "FAILED").length,
      skipped: results.filter((r) => r.status === "SKIPPED").length,
      pending: minimumBanks.filter((b) => b.status === "PENDING").length,
      readyForMerge,
    },
  };
}

export { formatRealBankHomologMarkdown };

export async function cleanupRealBankHomologUser(prisma: PrismaClient, userId: string) {
  await prisma.bankStatementLayoutCorrection.deleteMany({ where: { userId } });
  await prisma.bankStatementLayoutModel.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}
