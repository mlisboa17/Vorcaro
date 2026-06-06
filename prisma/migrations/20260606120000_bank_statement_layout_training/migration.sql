-- CreateEnum
CREATE TYPE "BankStatementLayoutFormat" AS ENUM ('PDF', 'OFX', 'CSV', 'XLS', 'XLSX', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "BankStatementLayoutStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BankStatementLayoutSimilarityTier" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "BankStatementLayoutModel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "profile" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "fileFormat" "BankStatementLayoutFormat" NOT NULL DEFAULT 'UNKNOWN',
    "layoutLabel" TEXT NOT NULL,
    "accountType" TEXT,
    "fingerprint" JSONB NOT NULL,
    "structureRules" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "accuracyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "correctionCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "lastSimilarityScore" DOUBLE PRECISION,
    "status" "BankStatementLayoutStatus" NOT NULL DEFAULT 'ACTIVE',
    "parentModelId" TEXT,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankStatementLayoutModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatementLayoutCorrection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "layoutModelId" TEXT NOT NULL,
    "originalLine" TEXT NOT NULL,
    "correctedDate" TEXT,
    "correctedDescription" TEXT,
    "correctedAmount" DECIMAL(15,2),
    "sourceDocumentId" TEXT,
    "sourceFileName" TEXT,
    "appliedToModel" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankStatementLayoutCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankStatementLayoutModel_userId_bankId_fileFormat_status_idx" ON "BankStatementLayoutModel"("userId", "bankId", "fileFormat", "status");

-- CreateIndex
CREATE INDEX "BankStatementLayoutModel_userId_status_idx" ON "BankStatementLayoutModel"("userId", "status");

-- CreateIndex
CREATE INDEX "BankStatementLayoutCorrection_userId_layoutModelId_idx" ON "BankStatementLayoutCorrection"("userId", "layoutModelId");

-- AddForeignKey
ALTER TABLE "BankStatementLayoutModel" ADD CONSTRAINT "BankStatementLayoutModel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementLayoutModel" ADD CONSTRAINT "BankStatementLayoutModel_parentModelId_fkey" FOREIGN KEY ("parentModelId") REFERENCES "BankStatementLayoutModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementLayoutCorrection" ADD CONSTRAINT "BankStatementLayoutCorrection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementLayoutCorrection" ADD CONSTRAINT "BankStatementLayoutCorrection_layoutModelId_fkey" FOREIGN KEY ("layoutModelId") REFERENCES "BankStatementLayoutModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
