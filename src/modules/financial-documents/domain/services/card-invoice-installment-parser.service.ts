import crypto from "crypto";
import { parseInstallmentStructure } from "@/lib/financial/installment-structural-parser";
import { normalizeBradescoDescription } from "@/lib/inbox/bradesco-invoice-parser";
import type { ExtractedInstallmentPurchase } from "../types/financial-document-import.types";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseBrazilianAmount(value: string): number | null {
  const cleaned = value
    .replace(/[^\d,.\-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".")
    .trim();
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value: string): string | null {
  const br = value.match(/^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/);
  if (!br) return null;
  const year = br[3] ?? String(new Date().getFullYear());
  return `${year}-${br[2]}-${br[1]}`;
}

const LINE_WITH_AMOUNT =
  /^(\d{2}\/\d{2}(?:\/\d{4})?)?\s*(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+(?:\.\d{2})?)\s*$/;

export function buildInstallmentPurchaseFingerprint(input: {
  userId: string;
  cardId?: string | null;
  merchant: string;
  installmentAmount: number;
  currentInstallment: number;
  totalInstallments: number;
  dueDate?: string | null;
}): string {
  const payload = JSON.stringify({
    userId: input.userId,
    cardId: input.cardId ?? "",
    merchant: input.merchant.toLowerCase(),
    installmentAmount: Number(input.installmentAmount.toFixed(2)),
    currentInstallment: input.currentInstallment,
    totalInstallments: input.totalInstallments,
    dueDate: input.dueDate ?? "",
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function parseInstallmentLine(line: string, cardName?: string): ExtractedInstallmentPurchase | null {
  const normalized = normalizeWhitespace(line);
  if (!normalized) return null;

  const match = normalized.match(LINE_WITH_AMOUNT);
  if (!match) return null;

  const purchaseDate = match[1] ? normalizeDate(match[1]) : null;
  const amount = parseBrazilianAmount(match[3]!);
  const rawDesc = match[2]!;

  const bradesco = normalizeBradescoDescription(rawDesc);
  const structural = parseInstallmentStructure(rawDesc);

  const currentInstallment = bradesco.installment ?? structural.numeroParcela;
  const totalInstallments = bradesco.totalInstallments ?? structural.totalParcelas;

  if (!structural.hadInstallmentMarker && bradesco.installment == null) return null;
  if (totalInstallments <= 1) return null;
  if (amount == null || amount <= 0) return null;

  const merchant = bradesco.description || structural.descricaoBase || rawDesc;

  return {
    id: `ip_${crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 12)}`,
    merchant,
    purchaseDate: purchaseDate ?? undefined,
    currentInstallment,
    totalInstallments,
    installmentAmount: amount,
    totalAmount: Number((amount * totalInstallments).toFixed(2)),
    cardName,
    confidence: 88,
  };
}

export function extractInstallmentPurchasesFromText(
  text: string,
  options?: { cardName?: string; userId?: string; cardId?: string | null; dueDate?: string },
): ExtractedInstallmentPurchase[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const purchases: ExtractedInstallmentPurchase[] = [];
  const seen = new Set<string>();

  for (const line of lines.slice(0, 800)) {
    const parsed = parseInstallmentLine(line, options?.cardName);
    if (!parsed) continue;

    const fingerprint =
      options?.userId != null
        ? buildInstallmentPurchaseFingerprint({
            userId: options.userId,
            cardId: options.cardId,
            merchant: parsed.merchant,
            installmentAmount: parsed.installmentAmount,
            currentInstallment: parsed.currentInstallment,
            totalInstallments: parsed.totalInstallments,
            dueDate: options?.dueDate,
          })
        : undefined;

    const dedupKey = fingerprint ?? parsed.id;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    purchases.push({
      ...parsed,
      dueDate: options?.dueDate,
      fingerprint,
    });
  }

  return purchases;
}

export function extractInstallmentPurchasesFromLines(
  lines: Array<{
    description?: string;
    amount?: number;
    date?: string;
    installment?: number;
    totalInstallments?: number;
    rawContent: string;
  }>,
  options?: { cardName?: string; userId?: string; cardId?: string | null; dueDate?: string },
): ExtractedInstallmentPurchase[] {
  const fromText = lines.flatMap((line) => extractInstallmentPurchasesFromText(line.rawContent, options));

  const fromFields = lines
    .filter((line) => line.installment != null && line.totalInstallments != null && line.totalInstallments > 1)
    .map((line) => {
      const merchant = line.description ?? line.rawContent;
      const purchase: ExtractedInstallmentPurchase = {
        id: `ip_${crypto.createHash("sha256").update(line.rawContent).digest("hex").slice(0, 12)}`,
        merchant,
        purchaseDate: line.date,
        currentInstallment: line.installment!,
        totalInstallments: line.totalInstallments!,
        installmentAmount: Math.abs(line.amount ?? 0),
        cardName: options?.cardName,
        dueDate: options?.dueDate,
        confidence: 90,
      };
      if (options?.userId) {
        purchase.fingerprint = buildInstallmentPurchaseFingerprint({
          userId: options.userId,
          cardId: options.cardId,
          merchant: purchase.merchant,
          installmentAmount: purchase.installmentAmount,
          currentInstallment: purchase.currentInstallment,
          totalInstallments: purchase.totalInstallments,
          dueDate: options?.dueDate,
        });
      }
      return purchase;
    });

  const merged = [...fromText, ...fromFields];
  const seen = new Set<string>();
  return merged.filter((item) => {
    const key = item.fingerprint ?? item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
