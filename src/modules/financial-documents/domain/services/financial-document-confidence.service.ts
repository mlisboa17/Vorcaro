import type { ClassificationResult, ParsedFinancialDocument } from "../types/financial-document.types";

export type ConfidenceExplanation = {
  confidence: number;
  reasons: string[];
  requiresMandatoryReview: boolean;
};

export function explainDocumentConfidence(input: {
  confidence: number;
  classification: ClassificationResult;
  parsed: ParsedFinancialDocument;
  threshold?: number;
}): ConfidenceExplanation {
  const threshold = input.threshold ?? 70;
  const reasons: string[] = [];
  const { fields } = input.parsed;
  const { classification } = input;

  if (classification.isLearnedPattern) {
    reasons.push("Fornecedor já conhecido");
    reasons.push("Padrão aprendido");
  } else if (classification.source === "user_rule") {
    reasons.push("Regra pessoal aplicada");
  } else if (classification.source === "system_rule") {
    reasons.push("Regra do sistema aplicada");
  } else if (classification.source.startsWith("learned")) {
    reasons.push("Padrão aprendido");
  } else {
    reasons.push("Fornecedor desconhecido");
  }

  if (fields.amount != null) {
    reasons.push("Valor identificado");
  } else {
    reasons.push("Valor não encontrado");
  }

  if (fields.date) {
    reasons.push("Data identificada");
  } else {
    reasons.push("Data não encontrada");
  }

  if (fields.bank) {
    reasons.push("Banco identificado");
  } else if (input.parsed.method === "PIX" || input.parsed.method === "TRANSFERENCIA") {
    reasons.push("Banco não identificado");
  }

  if (fields.pixKey || fields.cpfCnpj) {
    reasons.push("Dados completos");
  }

  const requiresMandatoryReview = input.confidence < threshold;

  return {
    confidence: input.confidence,
    reasons: [...new Set(reasons)],
    requiresMandatoryReview,
  };
}
