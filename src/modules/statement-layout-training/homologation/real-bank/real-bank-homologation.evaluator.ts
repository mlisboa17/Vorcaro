import type { RealBankHomologResultStatus, RealBankFileMetrics } from "./real-bank-homologation.types";

export function evaluateRecognitionRate(metrics: RealBankFileMetrics): RealBankHomologResultStatus {
  if (metrics.total === 0) return "FAILED";
  if (metrics.silentDrops > 0) return "FAILED";
  if (!metrics.rawContentPreserved) return "FAILED";
  if (metrics.recognitionRate >= 95 && metrics.ignored === 0) return "PASSED";
  if (metrics.recognitionRate >= 85) return "WARNING";
  return "FAILED";
}

export function buildMetricsFromLines(
  parsedCount: number,
  trainedLines: Array<{ parseStatus?: string; rawContent?: string }>,
): RealBankFileMetrics {
  const total = trainedLines.length;
  const recognized = trainedLines.filter((l) => l.parseStatus === "RECOGNIZED").length;
  const needsReview = trainedLines.filter(
    (l) => l.parseStatus === "NEEDS_REVIEW" || l.parseStatus === "ERROR",
  ).length;
  const ignored = trainedLines.filter((l) => l.parseStatus === "IGNORED").length;
  const errors = trainedLines.filter((l) => l.parseStatus === "ERROR").length;
  const rawContentPreserved = trainedLines.every((l) => (l.rawContent ?? "").trim().length > 0);
  const silentDrops = Math.max(0, parsedCount - total);
  const recognitionRate = total === 0 ? 0 : Math.round((recognized / total) * 1000) / 10;

  return {
    total,
    recognized,
    needsReview,
    ignored,
    errors,
    recognitionRate,
    rawContentPreserved,
    silentDrops,
  };
}

export function detectProblems(metrics: RealBankFileMetrics): string[] {
  const problems: string[] = [];
  if (metrics.silentDrops > 0) {
    problems.push(`${metrics.silentDrops} linha(s) descartada(s) silenciosamente`);
  }
  if (!metrics.rawContentPreserved) {
    problems.push("rawContent não preservado em todas as linhas");
  }
  if (metrics.ignored > 0) {
    problems.push(`${metrics.ignored} linha(s) ignorada(s)`);
  }
  if (metrics.errors > 0) {
    problems.push(`${metrics.errors} linha(s) com erro de parser`);
  }
  if (metrics.needsReview > metrics.total * 0.3) {
    problems.push("volume alto de NEEDS_REVIEW — possível layout quebrado");
  }
  if (metrics.recognitionRate < 85) {
    problems.push(`taxa de reconhecimento baixa (${metrics.recognitionRate}%)`);
  }
  return problems;
}
