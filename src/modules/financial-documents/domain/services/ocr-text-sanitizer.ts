/** Marcadores típicos de bytes crus interpretados como texto (fallback UTF-8 inválido). */
const BINARY_MARKERS = /\b(JFIF|PNG|RIFF|WEBP|Exif|ftyp|IHDR)\b/i;

export function containsBinaryOcrArtifacts(text: string): boolean {
  if (!text.trim()) return false;
  if (BINARY_MARKERS.test(text)) return true;
  // Sequências de bytes de controle suspeitas
  const controlCount = (text.match(/[\x00-\x08\x0E-\x1F]/g) ?? []).length;
  return controlCount > 3;
}

export function sanitizeOcrText(text: string): string {
  if (containsBinaryOcrArtifacts(text)) return "";
  let cleaned = text.replace(/\r\n/g, "\n");
  // OCR usually introduces multiple spaces and blank lines
  cleaned = cleaned.replace(/[ \t]{2,}/g, " "); // Replace multiple spaces with a single space
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n"); // Keep max 2 newlines
  return cleaned.trim();
}
