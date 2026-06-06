-- Sprint 15 — Captura inteligente de transações e aprendizado PIX/TED

CREATE TYPE "FinancialDocumentStatus" AS ENUM (
  'UPLOADED',
  'PROCESSING',
  'EXTRACTED',
  'REVIEW_REQUIRED',
  'APPROVED',
  'REJECTED',
  'FAILED'
);

CREATE TYPE "TransactionMethod" AS ENUM (
  'PIX',
  'TRANSFERENCIA',
  'BOLETO',
  'CARTAO_CREDITO',
  'OUTROS'
);

CREATE TYPE "FinancialDocumentSuggestionStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'EDITED',
  'REJECTED'
);

CREATE TABLE "FinancialDocument" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "storageKey" TEXT,
  "fingerprint" TEXT NOT NULL,
  "status" "FinancialDocumentStatus" NOT NULL DEFAULT 'UPLOADED',
  "extractedText" TEXT,
  "extractedJson" JSONB,
  "method" "TransactionMethod",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinancialDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialDocumentSuggestion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "status" "FinancialDocumentSuggestionStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(15,2),
  "date" TIMESTAMP(3),
  "description" TEXT,
  "supplier" TEXT,
  "method" "TransactionMethod",
  "categoryId" TEXT,
  "subcategoryId" TEXT,
  "confidence" INTEGER NOT NULL,
  "isLearnedPattern" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinancialDocumentSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialDocumentLearningPattern" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "method" "TransactionMethod" NOT NULL,
  "pixKey" TEXT,
  "documentNumber" TEXT,
  "normalizedName" TEXT,
  "categoryId" TEXT,
  "subcategoryId" TEXT,
  "occurrences" INTEGER NOT NULL DEFAULT 1,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinancialDocumentLearningPattern_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialDocument_userId_fingerprint_key" ON "FinancialDocument"("userId", "fingerprint");
CREATE INDEX "FinancialDocument_userId_status_idx" ON "FinancialDocument"("userId", "status");

CREATE INDEX "FinancialDocumentSuggestion_userId_status_idx" ON "FinancialDocumentSuggestion"("userId", "status");
CREATE INDEX "FinancialDocumentSuggestion_documentId_idx" ON "FinancialDocumentSuggestion"("documentId");

CREATE INDEX "FinancialDocumentLearningPattern_userId_idx" ON "FinancialDocumentLearningPattern"("userId");
CREATE INDEX "FinancialDocumentLearningPattern_userId_method_idx" ON "FinancialDocumentLearningPattern"("userId", "method");

ALTER TABLE "FinancialDocument" ADD CONSTRAINT "FinancialDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialDocumentSuggestion" ADD CONSTRAINT "FinancialDocumentSuggestion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "FinancialDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialDocumentLearningPattern" ADD CONSTRAINT "FinancialDocumentLearningPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
