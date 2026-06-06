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
  return text.replace(/\r\n/g, "\n").trim();
}
