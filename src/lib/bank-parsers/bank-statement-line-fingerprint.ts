import crypto from "crypto";

export function normalizeDescriptionForFingerprint(description: string): string {
  return description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildBankStatementLineFingerprint(input: {
  userId: string;
  bank: string;
  account?: string;
  date: string;
  amount: number;
  normalizedDescription: string;
}): string {
  const payload = [
    input.userId,
    input.bank,
    input.account ?? "",
    input.date,
    input.amount.toFixed(2),
    input.normalizedDescription,
  ].join("|");

  return crypto.createHash("sha256").update(payload).digest("hex");
}
