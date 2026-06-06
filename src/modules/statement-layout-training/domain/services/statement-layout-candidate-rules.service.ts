import type { StatementLayoutStructureRules } from "../types/statement-layout-model.types";

const MIN_OCCURRENCES_TO_MERGE = 2;

function ruleId(type: string, originalLine: string): string {
  return `${type}:${originalLine.slice(0, 80)}`;
}

export function upsertCandidateCorrection(
  rules: StatementLayoutStructureRules,
  input: {
    originalLine: string;
    sourceFileName?: string;
    correctedDescription?: string;
    correctedAmount?: number;
  },
): StatementLayoutStructureRules {
  const candidates = [...(rules.candidateRules ?? [])];
  const id = ruleId("correction_pattern", input.originalLine);
  const existing = candidates.find((c) => c.id === id);

  if (existing) {
    existing.occurrenceCount += 1;
    if (input.sourceFileName && !existing.sourceFiles.includes(input.sourceFileName)) {
      existing.sourceFiles.push(input.sourceFileName);
    }
  } else {
    candidates.push({
      id,
      type: "correction_pattern",
      description: `Correção para linha: ${input.originalLine.slice(0, 60)}…`,
      sourceFiles: input.sourceFileName ? [input.sourceFileName] : [],
      occurrenceCount: 1,
      suspicious: false,
      payload: {
        correctedDescription: input.correctedDescription,
        correctedAmount: input.correctedAmount,
      },
    });
  }

  return { ...rules, candidateRules: candidates.slice(-100) };
}

export function mergeEligibleCandidateRules(
  rules: StatementLayoutStructureRules,
): StatementLayoutStructureRules {
  const candidates = rules.candidateRules ?? [];
  const eligible = candidates.filter(
    (c) => c.occurrenceCount >= MIN_OCCURRENCES_TO_MERGE && !c.suspicious,
  );
  if (eligible.length === 0) return rules;

  const examples = [...rules.correctedExamples];
  for (const candidate of eligible) {
    if (candidate.type !== "correction_pattern") continue;
    const payload = candidate.payload ?? {};
    examples.push({
      originalLine: candidate.description.replace(/^Correção para linha: /, "").replace(/…$/, ""),
      description: payload.correctedDescription as string | undefined,
      amount: payload.correctedAmount as number | undefined,
    });
  }

  const remainingCandidates = candidates.filter((c) => c.occurrenceCount < MIN_OCCURRENCES_TO_MERGE || c.suspicious);

  return {
    ...rules,
    correctedExamples: examples.slice(-50),
    candidateRules: remainingCandidates,
  };
}

export function markCandidateSuspicious(
  rules: StatementLayoutStructureRules,
  reason: string,
): StatementLayoutStructureRules {
  const candidates = (rules.candidateRules ?? []).map((c) =>
    c.occurrenceCount === 1 ? { ...c, suspicious: true, description: `${c.description} (${reason})` } : c,
  );
  return { ...rules, candidateRules: candidates };
}
