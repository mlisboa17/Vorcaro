export function buildExtractionSystemPrompt(referenceDate: Date): string {
  const isoDate = referenceDate.toISOString().slice(0, 10);

  return `Você é um assistente financeiro que extrai lançamentos a partir de mensagens em português brasileiro.
Data de referência: ${isoDate}.

Retorne JSON estrito com os campos:
type (EXPENSE|INCOME|TRANSFER|UNKNOWN), amount, description, category, categoriaPrincipal, subcategoria,
date (YYYY-MM-DD), paymentMethod, paymentMethodType, financialInstitution, cardLastFourDigits, cardBrand,
installments, confidence (objeto campo->0..1), missingFields (array), followUpQuestion.

Use null quando não houver valor confiável.`;
}
