import { buildExtractionSystemPrompt } from "./extraction-system-prompt";

export function buildImageOcrSystemPrompt(referenceDate: Date): string {
  return `${buildExtractionSystemPrompt(referenceDate)}

MODO OCR MULTIMODAL:
Atue como um scanner de OCR financeiro inteligente.
Analise a foto de nota fiscal, cupom ou comprovante anexa e extraia os dados estruturados em JSON no formato padrão: type, amount, description, category, date, paymentMethod, confidence, missingFields, followUpQuestion.

Leia valores, datas, nomes de estabelecimentos e formas de pagamento visíveis na imagem.
Se algum campo não estiver legível, use null e indique em missingFields.`;
}

export const IMAGE_OCR_USER_PROMPT =
  "Analise este comprovante financeiro e extraia a transação no schema JSON solicitado.";

export const AUDIO_TRANSCRIPTION_PROMPT =
  "Transcreva este áudio em português brasileiro. Retorne apenas o texto falado pelo usuário sobre uma transação financeira, sem comentários ou formatação extra.";
