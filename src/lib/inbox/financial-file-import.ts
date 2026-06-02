import crypto from "crypto";

export type ImportFinancialFileType = "EXTRATO_BANCARIO" | "FATURA_CARTAO";

export type ImportedFinancialLine = {
  externalId?: string;
  date?: string; // YYYY-MM-DD (quando detectável)
  description?: string;
  amount?: number;
  rawContent: string;
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function safeNumber(value: string): number | null {
  if (normalizeDateToYyyyMmDd(value)) {
    return null;
  }

  const cleaned = value
    .replace(/[^\d,.\-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".")
    .trim();

  if (!cleaned || cleaned === "-" || cleaned === ".") {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDateToYyyyMmDd(value: string): string | null {
  const raw = value.trim();

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    return `${br[3]}-${br[2]}-${br[1]}`;
  }

  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compact) {
    return `${compact[1]}-${compact[2]}-${compact[3]}`;
  }

  return null;
}

function splitLines(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function computeImportHash(params: {
  userId: string;
  importType: ImportFinancialFileType;
  sourceFileName: string;
  accountId?: string | null;
  cardId?: string | null;
  date?: string;
  description?: string;
  amount?: number;
  rawContent: string;
}): string {
  const payload = JSON.stringify({
    userId: params.userId,
    importType: params.importType,
    sourceFileName: params.sourceFileName,
    accountId: params.accountId ?? null,
    cardId: params.cardId ?? null,
    date: params.date ?? null,
    description: params.description ?? null,
    amount: typeof params.amount === "number" ? params.amount : null,
    rawContent: normalizeWhitespace(params.rawContent),
  });

  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function parseCsvBankStatement(buffer: Buffer): ImportedFinancialLine[] {
  const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");
  const lines = splitLines(text);

  if (lines.length === 0) {
    return [];
  }

  const delimiter = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";

  const result: ImportedFinancialLine[] = [];

  for (const line of lines) {
    const cols = line.split(delimiter).map((value) => value.trim());

    const dateCandidate = cols.find((c) => normalizeDateToYyyyMmDd(c));
    const amountCandidate = cols.find((c) => safeNumber(c) !== null);
    const descriptionCandidate =
      cols.find((c) => c && !normalizeDateToYyyyMmDd(c) && safeNumber(c) === null) ?? cols[0];

    const date = dateCandidate ? normalizeDateToYyyyMmDd(dateCandidate) : null;
    const amount = amountCandidate ? safeNumber(amountCandidate) : null;
    const description = descriptionCandidate ? normalizeWhitespace(descriptionCandidate) : undefined;

    result.push({
      date: date ?? undefined,
      amount: amount ?? undefined,
      description,
      rawContent: normalizeWhitespace(line),
    });
  }

  return result;
}

export function parseOfxBankStatement(buffer: Buffer): ImportedFinancialLine[] {
  const text = buffer.toString("utf-8");
  const blocks = text.split(/<STMTTRN>/gi).slice(1);

  const result: ImportedFinancialLine[] = [];

  for (const block of blocks) {
    const dtposted = block.match(/<DTPOSTED>([^<\n\r]+)/i)?.[1]?.trim() ?? "";
    const trnamt = block.match(/<TRNAMT>([^<\n\r]+)/i)?.[1]?.trim() ?? "";
    const fitid = block.match(/<FITID>([^<\n\r]+)/i)?.[1]?.trim() ?? "";
    const name = block.match(/<NAME>([^<\n\r]+)/i)?.[1]?.trim() ?? "";
    const memo = block.match(/<MEMO>([^<\n\r]+)/i)?.[1]?.trim() ?? "";

    const date = normalizeDateToYyyyMmDd(dtposted);
    const amount = safeNumber(trnamt);
    const description = normalizeWhitespace(memo || name || "Lançamento OFX");

    const rawContent = normalizeWhitespace(
      [date ?? dtposted, description, amount !== null ? String(amount) : trnamt].filter(Boolean).join(" | "),
    );

    result.push({
      externalId: fitid || undefined,
      date: date ?? undefined,
      amount: amount ?? undefined,
      description,
      rawContent,
    });
  }

  return result;
}

