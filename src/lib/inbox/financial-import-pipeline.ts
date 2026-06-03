import crypto from "crypto";
import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import type { PrismaClient } from "@prisma/client";
import { geminiPdfLinesSchema } from "@/modules/financial-inbox/domain/schemas/financial-import-api.schema";
import type {
  CategorySuggestion,
  DetectedCardInfo,
  ImportedFinancialLine,
  ImportFinancialFileType,
  MatchedCardInfo,
} from "@/modules/financial-inbox/domain/types/imported-financial-line";
import { parseCsvBankStatement, parseOfxBankStatement } from "./financial-file-import";
import { PdfParseError, parsePdfWithLocalExtraction } from "./financial-file-import-pdf";
import {
  parseInstallmentStructure,
} from "@/lib/financial/installment-structural-parser";
import { resolveInboxInstallment } from "@/lib/financial/resolve-inbox-installment";

export interface ImportPipelineLine extends ImportedFinancialLine {
  lineIndex: number;
  importHash: string;
  isDuplicate: boolean;
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  categoryConfidence: "HIGH" | "MEDIUM" | "LOW";
  classificationScore?: number;
  classificationExplanation?: string;
  classificationSource?: string;
  readyToConfirm?: boolean;
  dataCompra?: string;
  dataCaixa?: string;
  dataVencimentoFatura?: string;
  descricaoBase?: string;
  installmentGroup?: string;
}

const BANK_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "NUBANK", regex: /\bnubank\b/i },
  { name: "ITAUCARD", regex: /\bita[úu]card\b|\bita[úu]\b/i },
  { name: "BRADESCO", regex: /\bbradesco\b/i },
  { name: "SANTANDER", regex: /\bsantander\b/i },
];

const BRAND_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "VISA", regex: /\bvisa\b/i },
  { name: "MASTERCARD", regex: /\bmaster\s?card\b|\bmaster\b/i },
  { name: "ELO", regex: /\belo\b/i },
  { name: "AMEX", regex: /\bamex\b|\bamerican express\b/i },
];

const CATEGORY_KEYWORDS: Array<{
  keyword: RegExp;
  categoriaPrincipal: string;
  subcategoria: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}> = [
  { keyword: /\b(ifood|restaurante|lanchonete|pizza|burger)\b/i, categoriaPrincipal: "Alimentação", subcategoria: "Restaurantes", confidence: "HIGH" },
  { keyword: /\b(uber|99|taxi|combust[ií]vel|posto)\b/i, categoriaPrincipal: "Transporte", subcategoria: "Mobilidade", confidence: "HIGH" },
  { keyword: /\b(aluguel|condom[ií]nio|energia|luz|água|agua|internet)\b/i, categoriaPrincipal: "Moradia", subcategoria: "Despesas da Casa", confidence: "MEDIUM" },
];

const GEMINI_PDF_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      date: { type: SchemaType.STRING },
      description: { type: SchemaType.STRING },
      amount: { type: SchemaType.NUMBER },
    },
    required: ["date", "description", "amount"],
  },
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractInstallments(text: string): { installment?: number; totalInstallments?: number } {
  const parsed = parseInstallmentStructure(text);
  if (!parsed.hadInstallmentMarker) {
    return {};
  }

  return {
    installment: parsed.numeroParcela,
    totalInstallments: parsed.totalParcelas,
  };
}

export function detectCardFromText(source: string): DetectedCardInfo {
  const bank = BANK_PATTERNS.find((entry) => entry.regex.test(source))?.name ?? null;
  const brand = BRAND_PATTERNS.find((entry) => entry.regex.test(source))?.name ?? null;
  const lastFourDigits = source.match(/\b(?:final|fim|ending)?\s*(\d{4})\b/i)?.[1] ?? null;
  const displayName = [bank, brand, lastFourDigits ? `Final ${lastFourDigits}` : null]
    .filter(Boolean)
    .join(" ");

  return {
    bank,
    brand,
    lastFourDigits,
    displayName: displayName || null,
  };
}

export async function matchDetectedCard(
  db: PrismaClient,
  userId: string,
  detected: DetectedCardInfo,
): Promise<MatchedCardInfo> {
  if (!detected.lastFourDigits && !detected.bank && !detected.brand) {
    return { ...detected, cardId: null, exists: false, cardName: null };
  }

  const cards = await db.card.findMany({
    where: { userId, isActive: true },
    select: { id: true, name: true, institutionName: true, brand: true, lastFourDigits: true },
  });

  const matched = cards.find((card) => {
    if (detected.lastFourDigits && card.lastFourDigits !== detected.lastFourDigits) return false;
    if (detected.brand && card.brand !== detected.brand) return false;
    if (
      detected.bank &&
      !(card.institutionName ?? card.name).toLowerCase().includes(detected.bank.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return {
    ...detected,
    cardId: matched?.id ?? null,
    exists: Boolean(matched),
    cardName: matched?.name ?? null,
  };
}

function scoreToLegacyConfidence(score: number): CategorySuggestion["confidence"] {
  if (score >= 90) return "HIGH";
  if (score >= 70) return "MEDIUM";
  return "LOW";
}

export async function suggestCategory(
  db: PrismaClient,
  userId: string,
  description: string,
): Promise<CategorySuggestion & {
  classificationScore?: number;
  classificationExplanation?: string;
  classificationSource?: string;
  readyToConfirm?: boolean;
}> {
  const { InboxClassificationService } = await import(
    "@/modules/inbox-intelligence/application/services/inbox-classification.service"
  );
  const classifier = new InboxClassificationService(db);
  const suggestion = await classifier.classify({ userId, description });

  return {
    categoryId: suggestion.categoryId,
    categoryName: suggestion.categoryName,
    categoriaPrincipal: suggestion.categoriaPrincipal,
    subcategoria: suggestion.subcategoria,
    confidence: scoreToLegacyConfidence(suggestion.confidence),
    classificationScore: suggestion.confidence,
    classificationExplanation: suggestion.explanation,
    classificationSource: suggestion.source,
    readyToConfirm: suggestion.readyToConfirm,
  };
}

async function parsePdfWithGemini(buffer: Buffer): Promise<ImportedFinancialLine[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Importação de PDF ainda requer parser de texto/IA e será habilitada em seguida.",
    );
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: GEMINI_PDF_RESPONSE_SCHEMA,
    },
  });

  const prompt =
    "Extraia lançamentos financeiros do PDF e retorne APENAS JSON no formato [{date:'YYYY-MM-DD',description:'',amount:number}].";
  const base64 = buffer.toString("base64");

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "application/pdf", data: base64 } },
        ],
      },
    ],
  });

  const text = result.response.text()?.trim() ?? "[]";
  const parsed = JSON.parse(text);
  const validated = geminiPdfLinesSchema.parse(parsed);

  return validated.map((line) => ({
    date: line.date,
    description: normalizeText(line.description),
    amount: line.amount,
    rawContent: `${line.date} | ${normalizeText(line.description)} | ${line.amount}`,
  }));
}

export async function parseImportFile(input: {
  buffer: Buffer;
  extension: "csv" | "ofx" | "pdf";
  fileName?: string;
  pdfPassword?: string;
}): Promise<ImportedFinancialLine[]> {
  if (input.extension === "csv") {
    return parseCsvBankStatement(input.buffer);
  }

  if (input.extension === "ofx") {
    return parseOfxBankStatement(input.buffer);
  }

  const fileName = input.fileName ?? "arquivo.pdf";
  const password = input.pdfPassword?.trim() || undefined;

  if (password) {
    return parsePdfWithLocalExtraction(input.buffer, fileName, password);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      return await parsePdfWithGemini(input.buffer);
    } catch (error) {
      if (error instanceof PdfParseError) {
        throw error;
      }

      try {
        return await parsePdfWithLocalExtraction(input.buffer, fileName);
      } catch (localError) {
        if (localError instanceof PdfParseError) {
          throw localError;
        }
        throw error instanceof Error ? error : new Error("Falha ao processar o PDF com IA.");
      }
    }
  }

  return parsePdfWithLocalExtraction(input.buffer, fileName);
}

export function buildImportHash(params: {
  userId: string;
  importType: ImportFinancialFileType;
  sourceFileName: string;
  accountId?: string | null;
  cardId?: string | null;
  line: ImportedFinancialLine;
}): string {
  const sourceText = normalizeText(params.line.description ?? params.line.rawContent);
  const structural = parseInstallmentStructure(sourceText);
  const descricaoBase = structural.descricaoBase || normalizeText(params.line.description ?? "");
  const numeroParcela = params.line.installment ?? structural.numeroParcela;
  const totalParcelas = params.line.totalInstallments ?? structural.totalParcelas;

  const raw = JSON.stringify({
    userId: params.userId,
    importType: params.importType,
    sourceFileName: params.sourceFileName,
    accountId: params.accountId ?? null,
    cardId: params.cardId ?? null,
    date: params.line.date ?? null,
    description: descricaoBase,
    descricaoBase,
    numeroParcela: structural.hadInstallmentMarker ? numeroParcela : null,
    totalParcelas: structural.hadInstallmentMarker ? totalParcelas : null,
    amount: typeof params.line.amount === "number" ? params.line.amount : null,
    rawContent: normalizeText(params.line.rawContent),
  });

  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function buildPreviewLines(params: {
  db: PrismaClient;
  userId: string;
  importType: ImportFinancialFileType;
  sourceFileName: string;
  accountId?: string | null;
  cardId?: string | null;
  parsedLines: ImportedFinancialLine[];
  defaultDataCaixa?: string;
  defaultDataVencimentoFatura?: string;
}): Promise<ImportPipelineLine[]> {
  const output: ImportPipelineLine[] = [];

  for (let index = 0; index < params.parsedLines.length; index += 1) {
    const line = params.parsedLines[index]!;
    const importHash = buildImportHash({
      userId: params.userId,
      importType: params.importType,
      sourceFileName: params.sourceFileName,
      accountId: params.accountId,
      cardId: params.cardId,
      line,
    });

    const duplicate = line.externalId
      ? await params.db.financialInbox.findFirst({
          where: { userId: params.userId, channel: "WEB_IMPORT", externalId: line.externalId },
          select: { id: true },
        })
      : await params.db.financialInbox.findFirst({
          where: { userId: params.userId, channel: "WEB_IMPORT", importHash },
          select: { id: true },
        });

    const installments = extractInstallments(line.description ?? line.rawContent);
    const category = await suggestCategory(params.db, params.userId, line.description ?? line.rawContent);
    const amount = typeof line.amount === "number" ? line.amount : null;
    const installmentResolved =
      amount != null && amount > 0
        ? resolveInboxInstallment({
            userId: params.userId,
            description: line.description ?? line.rawContent,
            rawContent: line.rawContent,
            amount,
            cardId: params.cardId ?? null,
            purchaseDate: line.date ?? null,
            dataCompra: line.date,
            dataCaixa:
              params.importType === "FATURA_CARTAO" ? params.defaultDataCaixa ?? undefined : line.date,
            dataVencimentoFatura:
              params.importType === "FATURA_CARTAO"
                ? params.defaultDataVencimentoFatura ?? undefined
                : undefined,
            existingNumeroParcela: line.installment ?? installments.installment ?? null,
            existingTotalParcelas: line.totalInstallments ?? installments.totalInstallments ?? null,
          })
        : null;

    output.push({
      ...line,
      lineIndex: index,
      importHash,
      isDuplicate: Boolean(duplicate),
      description: installmentResolved?.descricaoBase ?? line.description,
      descricaoBase: installmentResolved?.descricaoBase,
      installment:
        installmentResolved?.numeroParcela ?? line.installment ?? installments.installment,
      totalInstallments:
        installmentResolved?.totalParcelas ??
        line.totalInstallments ??
        installments.totalInstallments,
      installmentGroup: installmentResolved?.installmentGroup ?? undefined,
      suggestedCategoryId: category.categoryId,
      suggestedCategoryName: category.categoryName,
      categoryConfidence: category.confidence,
      classificationScore: category.classificationScore,
      classificationExplanation: category.classificationExplanation,
      classificationSource: category.classificationSource,
      readyToConfirm: category.readyToConfirm,
      dataCompra: line.date,
      dataCaixa: params.importType === "FATURA_CARTAO" ? params.defaultDataCaixa : line.date,
      dataVencimentoFatura:
        params.importType === "FATURA_CARTAO" ? params.defaultDataVencimentoFatura : undefined,
    });
  }

  return output;
}

