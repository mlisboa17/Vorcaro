import type { BankLayoutDocumentType, BankLayoutSource } from "./bank-layout.types";

const ANDROID_MARKERS = [
  /app\s+android/i,
  /google\s+play/i,
  /exportado\s+pelo\s+app/i,
  /vers[aã]o\s+android/i,
];

const IOS_MARKERS = [
  /\biphone\b/i,
  /\bios\b/i,
  /app\s+store/i,
  /exportado\s+pelo\s+aplicativo/i,
  /apple\s+pay/i,
];

const WEB_MARKERS = [
  /internet\s+banking/i,
  /acesso\s+web/i,
  /www\./i,
  /https?:\/\//i,
  /exportado\s+pela\s+internet/i,
  /canal\s+internet/i,
];

export function detectBankLayoutSource(text: string, metaSource?: BankLayoutSource): BankLayoutSource {
  if (metaSource && metaSource !== "UNKNOWN") return metaSource;

  const android = ANDROID_MARKERS.some((m) => m.test(text));
  const ios = IOS_MARKERS.some((m) => m.test(text));
  const web = WEB_MARKERS.some((m) => m.test(text));

  if (android && !ios) return "ANDROID";
  if (ios && !android) return "IOS";
  if (web) return "WEB";

  const printableRatio = text.replace(/\s/g, "").length / Math.max(text.length, 1);
  const hasManyLines = text.split("\n").filter(Boolean).length >= 3;
  if (printableRatio < 0.15 && text.length > 50) return "SCANNED";
  if (text.includes("[ocr") || /ocr\s+fallback/i.test(text)) return "SCANNED";

  return hasManyLines ? "WEB" : "UNKNOWN";
}

export function detectBankLayoutDocumentType(
  text: string,
  metaType?: BankLayoutDocumentType,
): BankLayoutDocumentType {
  if (metaType && metaType !== "OUTROS") return metaType;

  const lower = text.toLowerCase();
  if (/fatura\s+(?:do\s+)?cart[aã]o|valor\s+total\s+da\s+fatura/i.test(lower)) return "FATURA";
  if (/comprovante\s+pix|pix\s+enviado|pix\s+recebido|transfer[eê]ncia\s+pix/i.test(lower) && !/extrato/i.test(lower)) {
    return "PIX";
  }
  if (/\bted\b|transfer[eê]ncia\s+eletr[oô]nica/i.test(lower) && !/extrato/i.test(lower)) return "TED";
  if (/\bdoc\b|documento\s+de\s+ordem/i.test(lower) && !/extrato/i.test(lower)) return "DOC";
  if (/extrato|lan[cç]amentos|conta\s+corrente|saldo\s+anterior/i.test(lower)) return "EXTRATO";
  return "OUTROS";
}

export function inferRequiresOcr(text: string, source: BankLayoutSource): boolean {
  if (source === "SCANNED") return true;
  const trimmed = text.trim();
  if (trimmed.length < 80) return true;
  const alphaNum = trimmed.replace(/[^a-zA-Z0-9À-ú]/g, "").length;
  return alphaNum / trimmed.length < 0.2;
}
