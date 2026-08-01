// Multimodal feedback messages for Telegram

export const MULTIMODAL_MESSAGES = {
  photo: '📷 Foto recebida. Extraindo dados do comprovante...',
  audio: '🎤 Áudio recebido. Transcrevendo com IA...',
  text: '💬 Entendi! Deixa eu confirmar os dados...',
  document: '📄 Documento recebido. Processando...',
  confirmSuccess: '✅ Perfeito! Transação registrada.',
  error: '❌ Desculpa, algo deu errado. Tenta de novo?',
};

export function getMediaTypeMessage(mediaType: 'photo' | 'audio' | 'text' | 'document'): string {
  return MULTIMODAL_MESSAGES[mediaType] || MULTIMODAL_MESSAGES.text;
}

export interface MediaInput {
  type: 'photo' | 'audio' | 'text' | 'document';
  caption?: string;
  fileId?: string;
}

export function validateMediaInput(media: MediaInput): boolean {
  // Allow media WITHOUT caption (multimodal freedom)
  return !!media.type && (!!media.caption || !!media.fileId);
}
