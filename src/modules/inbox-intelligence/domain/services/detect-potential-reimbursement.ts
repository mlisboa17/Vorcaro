export type ReimbursementDetectionResult = {
  isPotentialReimbursement: boolean;
  reimbursementReason: string | null;
  reimbursementConfidence: number;
};

const REIMBURSEMENT_PATTERNS: Array<{
  pattern: RegExp;
  reason: string;
  confidence: number;
}> = [
  {
    pattern: /\b(passagem|passagens)\b.*\b(terceiro|cliente|empresa|corporativ)/i,
    confidence: 72,
    reason: "Passagem que pode ser reembolsada por terceiro ou empresa.",
  },
  {
    pattern: /\b(hotel|hospedagem|airbnb)\b.*\b(cliente|empresa|corporativ|viagem\s+de\s+trabalho)/i,
    confidence: 70,
    reason: "Hospedagem que pode ser despesa corporativa ou reembolsável.",
  },
  {
    pattern: /\b(compra|pagamento)\b.*\b(familiar|filho|filha|esposa|marido|mae|pai)\b/i,
    confidence: 68,
    reason: "Compra que pode ser reembolsada por familiar.",
  },
  {
    pattern: /\b(despesa|gasto)\s+corporativ/i,
    confidence: 75,
    reason: "Indício de despesa corporativa — possível conta a receber.",
  },
  {
    pattern: /\b(reembolso|reembolsavel|conta\s+a\s+receber)\b/i,
    confidence: 82,
    reason: "Descrição menciona reembolso ou conta a receber.",
  },
];

export function detectPotentialReimbursement(text: string): ReimbursementDetectionResult {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return {
      isPotentialReimbursement: false,
      reimbursementReason: null,
      reimbursementConfidence: 0,
    };
  }

  for (const entry of REIMBURSEMENT_PATTERNS) {
    if (entry.pattern.test(normalized)) {
      return {
        isPotentialReimbursement: true,
        reimbursementReason: entry.reason,
        reimbursementConfidence: entry.confidence,
      };
    }
  }

  return {
    isPotentialReimbursement: false,
    reimbursementReason: null,
    reimbursementConfidence: 0,
  };
}
