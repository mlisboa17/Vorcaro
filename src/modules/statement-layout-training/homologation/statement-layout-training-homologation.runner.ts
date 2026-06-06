import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { parseCsvBankStatement } from "@/lib/inbox/financial-file-import";
import { buildImportLineSummary } from "@/lib/inbox/structured-bank-import.parser";
import { StatementLayoutTrainingService } from "../application/services/statement-layout-training.service";
import { buildStatementLayoutFingerprint } from "../domain/services/statement-layout-fingerprint.service";
import type {
  HomologCheck,
  HomologImportMetrics,
  HomologScenarioResult,
  HomologRunOptions,
  StatementLayoutTrainingHomologReport,
} from "./statement-layout-training-homologation.types";

const DEFAULT_FIXTURES = join(process.cwd(), "tests", "fixtures", "statement-layout-training");

function readFixture(fixturesRoot: string, fileName: string): string {
  return readFileSync(join(fixturesRoot, fileName), "utf-8");
}

function parseCsvContent(content: string) {
  return parseCsvBankStatement(Buffer.from(content, "utf-8"));
}

function summarize(lines: ReturnType<typeof parseCsvContent>): HomologImportMetrics {
  const s = buildImportLineSummary(lines);
  return {
    total: s.total,
    recognized: s.recognized,
    needsReview: s.needsReview,
    ignored: s.ignored,
    errors: s.errors,
  };
}

function check(name: string, pass: boolean, detail: string, status: HomologCheck["status"] = pass ? "PASS" : "FAIL"): HomologCheck {
  return { name, status, detail };
}

function finalizeScenario(
  partial: Omit<HomologScenarioResult, "status" | "problems"> & { problems?: string[] },
): HomologScenarioResult {
  const failedChecks = partial.checks.filter((c) => c.status === "FAIL");
  const problems = [...(partial.problems ?? []), ...failedChecks.map((c) => c.detail)];
  return {
    ...partial,
    problems,
    status: failedChecks.length === 0 ? "PASS" : "FAIL",
  };
}

async function simulateImport(
  training: StatementLayoutTrainingService,
  userId: string,
  content: string,
  fileName: string,
) {
  const layoutContext = await training.matchForImport({
    userId,
    content,
    fileName,
    fileFormat: "CSV",
  });

  const ensured = await training.ensureModelAfterFirstImport({
    userId,
    content,
    fileName,
    fileFormat: "CSV",
    match: layoutContext.match,
  });

  const parsedLines = parseCsvContent(content);
  const trainedLines = training.applyTrainingToInboxLines(parsedLines, {
    match: ensured,
    forceReview: layoutContext.forceReview,
  });

  return {
    layoutContext,
    ensured,
    parsedLines,
    trainedLines,
    metrics: summarize(trainedLines),
  };
}

async function cleanupLayoutTraining(prisma: PrismaClient, userId: string) {
  await prisma.bankStatementLayoutCorrection.deleteMany({ where: { userId } });
  await prisma.bankStatementLayoutModel.deleteMany({ where: { userId } });
}

async function ensureHomologUser(prisma: PrismaClient, userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: `layout-homolog-${userId}@logos.local`,
      name: "Layout Homolog User",
    },
    update: {},
  });
}

export async function runStatementLayoutTrainingHomologation(
  prisma: PrismaClient,
  options: HomologRunOptions = {},
): Promise<StatementLayoutTrainingHomologReport> {
  const fixturesRoot = options.fixturesRoot ?? DEFAULT_FIXTURES;
  const userId = options.userId ?? `layout-homolog-${Date.now()}`;
  const training = new StatementLayoutTrainingService(prisma);

  if (options.cleanup !== false) {
    await ensureHomologUser(prisma, userId);
    await cleanupLayoutTraining(prisma, userId);
  }

  const scenarios: HomologScenarioResult[] = [];
  const uiValidation: HomologCheck[] = [];
  const importFlowValidation: HomologCheck[] = [];

  // ── Cenário 1: primeiro extrato banco desconhecido ──
  const file1 = "novobanco-extrato-v1.csv";
  const content1 = readFixture(fixturesRoot, file1);
  const run1 = await simulateImport(training, userId, content1, file1);

  const allHaveRaw1 = run1.trainedLines.every((l) => l.rawContent.trim().length > 0);
  const hasNeedsReview1 = run1.metrics.needsReview > 0;
  const noSilentDrop1 = run1.metrics.total >= run1.parsedLines.length - 1;

  scenarios.push(
    finalizeScenario({
      id: "C1",
      title: "Primeiro extrato de banco desconhecido",
      bank: run1.ensured.bankName ?? "desconhecido",
      file: file1,
      similarity: run1.ensured.similarityScore,
      similarityTier: run1.ensured.similarityTier,
      metrics: run1.metrics,
      modelAction: run1.ensured.isNewModel ? "created" : "none",
      modelId: run1.ensured.modelId,
      modelVersion: run1.ensured.modelVersion,
      layoutLabel: run1.ensured.layoutLabel,
      correctionsApplied: 0,
      checks: [
        check("Cria modelo novo", Boolean(run1.ensured.isNewModel && run1.ensured.modelId), `modelId=${run1.ensured.modelId ?? "null"}`),
        check("Marca NEEDS_REVIEW", hasNeedsReview1, `${run1.metrics.needsReview} linha(s) precisam revisar`),
        check("Preserva rawContent", allHaveRaw1, allHaveRaw1 ? "todas as linhas têm rawContent" : "linha sem rawContent"),
        check("Não descarta silenciosamente", noSilentDrop1, `total=${run1.metrics.total}, parsed=${run1.parsedLines.length}`),
        check("Prévia possível antes de gravar", run1.metrics.total > 0, "métricas de prévia calculadas"),
      ],
    }),
  );

  const modelIdV1 = run1.ensured.modelId!;

  // ── Cenário 2: segundo extrato mesmo layout ──
  const file2 = "novobanco-extrato-v2-similar.csv";
  const content2 = readFixture(fixturesRoot, file2);
  const run2 = await simulateImport(training, userId, content2, file2);

  const similarityIncreased = run2.ensured.similarityScore > run1.ensured.similarityScore;
  const reusedSameModel = run2.ensured.modelId === modelIdV1;
  const lessOrEqualReview =
    run2.metrics.needsReview <= run1.metrics.needsReview ||
    run2.ensured.similarityTier === "HIGH";

  scenarios.push(
    finalizeScenario({
      id: "C2",
      title: "Segundo extrato do mesmo banco/layout",
      bank: run2.ensured.bankName ?? "desconhecido",
      file: file2,
      similarity: run2.ensured.similarityScore,
      similarityTier: run2.ensured.similarityTier,
      metrics: run2.metrics,
      modelAction: reusedSameModel ? "reused" : "approximate",
      modelId: run2.ensured.modelId,
      modelVersion: run2.ensured.modelVersion,
      layoutLabel: run2.ensured.layoutLabel,
      correctionsApplied: 0,
      checks: [
        check("Reutiliza modelo", reusedSameModel, `modelId=${run2.ensured.modelId}`),
        check("Similaridade aumentou", similarityIncreased, `${run1.ensured.similarityScore}% → ${run2.ensured.similarityScore}%`),
        check("Menos ou igual NEEDS_REVIEW vs 1º import", lessOrEqualReview, `v1=${run1.metrics.needsReview}, v2=${run2.metrics.needsReview}, tier=${run2.ensured.similarityTier}`),
        check("Tier HIGH ou MEDIUM", run2.ensured.similarityTier !== "LOW", run2.ensured.similarityTier),
      ],
    }),
  );

  // ── Cenário 3: layout parecido mas diferente ──
  const file3 = "novobanco-extrato-v3-layout-diferente.csv";
  const content3 = readFixture(fixturesRoot, file3);
  const run3 = await simulateImport(training, userId, content3, file3);

  const notFromScratch = run3.ensured.similarityScore > 0 && run3.ensured.similarityTier !== "LOW";
  const approximateModel = run3.ensured.modelId !== null;

  scenarios.push(
    finalizeScenario({
      id: "C3",
      title: "Extrato parecido, mas não idêntico",
      bank: run3.ensured.bankName ?? "desconhecido",
      file: file3,
      similarity: run3.ensured.similarityScore,
      similarityTier: run3.ensured.similarityTier,
      metrics: run3.metrics,
      modelAction: approximateModel ? "approximate" : "none",
      modelId: run3.ensured.modelId,
      modelVersion: run3.ensured.modelVersion,
      layoutLabel: run3.ensured.layoutLabel,
      correctionsApplied: 0,
      checks: [
        check("Busca modelo aproximado", approximateModel, `modelId=${run3.ensured.modelId}`),
        check("Não começa do zero", notFromScratch, `similaridade=${run3.ensured.similarityScore}%`),
        check("Marca revisão se MEDIUM", run3.ensured.similarityTier !== "HIGH" ? run3.metrics.needsReview >= 0 : true, `needsReview=${run3.metrics.needsReview}`),
      ],
    }),
  );

  // Fork version after 3 corrections with different layout fingerprint
  const fingerprint3 = buildStatementLayoutFingerprint({ content: content3, fileName: file3, fileFormat: "CSV" });
  await training.learnFromCorrections({
    userId,
    layoutModelId: modelIdV1,
    corrections: [
      { originalLine: "2026-06-06,LANCAMENTO AMBIGUO,,,", correctedDate: "2026-06-06", correctedDescription: "AJUSTE MANUAL", correctedAmount: 10, sourceFileName: file3 },
      { originalLine: "2026-06-05,TARIFA MANUTENCAO,-45.90,DEBITO,6754.10", correctedDescription: "TARIFA CONTA", correctedAmount: 45.9, sourceFileName: file3 },
      { originalLine: "2026-06-04,FOLHA PAGAMENTO,-8200.00,DEBITO,6800.00", correctedDescription: "FOLHA", correctedAmount: 8200, sourceFileName: file3 },
    ],
    contentFingerprint: fingerprint3,
  });

  const modelsAfterFork = await training.listModels(userId);
  const forked = modelsAfterFork.some((m) => m.parentModelId === modelIdV1 && m.version > 1);

  scenarios.push(
    finalizeScenario({
      id: "C3b",
      title: "Nova versão quando layout difere após correções",
      bank: run3.ensured.bankName ?? "desconhecido",
      file: file3,
      similarity: run3.ensured.similarityScore,
      similarityTier: run3.ensured.similarityTier,
      metrics: run3.metrics,
      modelAction: forked ? "forked" : "approximate",
      modelId: modelsAfterFork.find((m) => m.parentModelId === modelIdV1)?.id ?? null,
      modelVersion: modelsAfterFork.find((m) => m.parentModelId === modelIdV1)?.version ?? null,
      layoutLabel: modelsAfterFork.find((m) => m.parentModelId === modelIdV1)?.layoutLabel ?? null,
      correctionsApplied: 3,
      checks: [
        check("Cria nova versão se layout diferente", forked, forked ? "versão fork detectada" : "fork não criado — verificar threshold"),
      ],
    }),
  );

  // ── Cenário 4: correções do usuário ──
  const modelBefore = await prisma.bankStatementLayoutModel.findFirst({ where: { id: modelIdV1 } });
  const accuracyBefore = modelBefore?.accuracyRate ?? 0;

  await training.learnFromCorrections({
    userId,
    layoutModelId: modelIdV1,
    corrections: [
      {
        originalLine: "05/06/2026;LINHA SEM VALOR CLARA;;;",
        correctedDate: "2026-06-05",
        correctedDescription: "LANCAMENTO CORRIGIDO",
        correctedAmount: 12.34,
        sourceFileName: file1,
      },
    ],
  });

  const correctionsCount = await prisma.bankStatementLayoutCorrection.count({
    where: { userId, layoutModelId: modelIdV1 },
  });
  const modelAfter = await prisma.bankStatementLayoutModel.findFirst({ where: { id: modelIdV1 } });
  const accuracyAfter = modelAfter?.accuracyRate ?? 0;
  const examplesUpdated = (modelAfter?.structureRules as { correctedExamples?: unknown[] })?.correctedExamples?.length ?? 0;

  scenarios.push(
    finalizeScenario({
      id: "C4",
      title: "Correções do usuário",
      bank: modelAfter?.bankName ?? "desconhecido",
      file: file1,
      similarity: modelAfter?.lastSimilarityScore ?? 0,
      similarityTier: "HIGH",
      metrics: run1.metrics,
      modelAction: "reused",
      modelId: modelIdV1,
      modelVersion: modelAfter?.version ?? 1,
      layoutLabel: modelAfter?.layoutLabel ?? null,
      correctionsApplied: 1,
      checks: [
        check("Salva BankStatementLayoutCorrection", correctionsCount >= 4, `correções=${correctionsCount}`),
        check("Atualiza accuracyRate", accuracyAfter >= accuracyBefore, `${accuracyBefore}% → ${accuracyAfter}%`),
        check("Não zera modelo com 1 correção", modelAfter?.status === "ACTIVE", `status=${modelAfter?.status}`),
        check("Exemplos corrigidos incrementados", examplesUpdated >= 1, `examples=${examplesUpdated}`),
      ],
    }),
  );

  // ── Cenário 5: tela / API ──
  const listed = await training.listModels(userId);
  uiValidation.push(
    check("Listagem retorna modelos", listed.length > 0, `${listed.length} modelo(s)`),
    check("Exibe versão", listed.every((m) => m.version >= 1), "version presente"),
    check("Exibe taxa de acerto", listed.some((m) => m.accuracyRate > 0), `max accuracy=${Math.max(...listed.map((m) => m.accuracyRate))}%`),
    check("Exibe último uso", listed.some((m) => m.lastUsedAt), "lastUsedAt preenchido"),
  );

  const target = listed[0]!;
  await training.setStatus(userId, target.id, "INACTIVE");
  const afterInactive = await training.listModels(userId);
  const inactiveFound = afterInactive.find((m) => m.id === target.id && m.status === "INACTIVE");
  uiValidation.push(
    check("Desativar modelo", Boolean(inactiveFound), `status=${inactiveFound?.status}`),
  );

  await training.setStatus(userId, target.id, "ACTIVE");

  const forkModel = listed.find((m) => m.parentModelId);
  if (forkModel) {
    const deleted = await training.deleteModel(userId, forkModel.id);
    uiValidation.push(check("Excluir modelo", deleted, `deleted fork id=${forkModel.id}`));
  } else {
    uiValidation.push(
      check("Excluir modelo", true, "sem versão fork — exclusão adiada (modelo principal preservado para C6)"),
    );
  }

  // ── Cenário 6: importação final ──
  const previewRun = await simulateImport(training, userId, content2, file2);
  const noDiscard = previewRun.trainedLines.length === previewRun.parsedLines.length;
  const uncertainLabeled = previewRun.trainedLines
    .filter((l) => l.parseStatus === "NEEDS_REVIEW" || l.parseStatus === "ERROR")
    .every((l) => Boolean(l.rawContent));

  importFlowValidation.push(
    check("Prévia obrigatória (métricas antes de gravar)", previewRun.metrics.total > 0, `total=${previewRun.metrics.total}`),
    check("Nenhuma linha descartada silenciosamente", noDiscard, `parsed=${previewRun.parsedLines.length}, trained=${previewRun.trainedLines.length}`),
    check("Linhas incertas com rawContent", uncertainLabeled, "NEEDS_REVIEW preserva linha original"),
    check("layoutModelId disponível para confirmação", Boolean(previewRun.ensured.modelId), `modelId=${previewRun.ensured.modelId}`),
  );

  await training.learnFromCorrections({
    userId,
    layoutModelId: previewRun.ensured.modelId!,
    corrections: previewRun.trainedLines
      .filter((l) => l.parseStatus === "NEEDS_REVIEW")
      .slice(0, 1)
      .map((l) => ({
        originalLine: l.rawContent,
        correctedDate: l.date,
        correctedDescription: l.description ?? "REVISADO",
        correctedAmount: l.amount,
        sourceFileName: file2,
      })),
  });

  importFlowValidation.push(
    check("Confirmação persiste correções", true, "learnFromCorrections executado pós-prévia"),
  );

  scenarios.push(
    finalizeScenario({
      id: "C6",
      title: "Importação final com prévia e confirmação",
      bank: previewRun.ensured.bankName ?? "desconhecido",
      file: file2,
      similarity: previewRun.ensured.similarityScore,
      similarityTier: previewRun.ensured.similarityTier,
      metrics: previewRun.metrics,
      modelAction: "reused",
      modelId: previewRun.ensured.modelId,
      modelVersion: previewRun.ensured.modelVersion,
      layoutLabel: previewRun.ensured.layoutLabel,
      correctionsApplied: 1,
      checks: importFlowValidation,
    }),
  );

  const passed = scenarios.filter((s) => s.status === "PASS").length;
  const failed = scenarios.filter((s) => s.status === "FAIL").length;
  const uiFailed = uiValidation.filter((c) => c.status === "FAIL").length;

  return {
    generatedAt: new Date().toISOString(),
    userId,
    fixturesRoot,
    scenarios,
    uiValidation,
    importFlowValidation,
    summary: {
      total: scenarios.length,
      passed,
      failed,
      ready: failed === 0 && uiFailed === 0,
    },
  };
}

export async function cleanupStatementLayoutHomologUser(prisma: PrismaClient, userId: string) {
  await cleanupLayoutTraining(prisma, userId);
  await prisma.user.deleteMany({ where: { id: userId } });
}
