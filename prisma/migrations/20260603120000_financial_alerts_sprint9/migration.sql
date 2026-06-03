-- CreateEnum
CREATE TYPE "FinancialAlertType" AS ENUM ('UPCOMING_PAYMENT', 'OVERDUE_RECEIVABLE', 'CREDIT_CARD_RISK', 'CASHFLOW_WARNING', 'GOAL_AT_RISK', 'HIGH_COMMITMENT_MONTH', 'REIMBURSEMENT_DELAY');

-- CreateEnum
CREATE TYPE "FinancialAlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FinancialAlertStatus" AS ENUM ('OPEN', 'DISMISSED', 'RESOLVED');

-- CreateTable
CREATE TABLE "FinancialAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "FinancialAlertType" NOT NULL,
    "severity" "FinancialAlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "FinancialAlertStatus" NOT NULL DEFAULT 'OPEN',
    "fingerprint" TEXT NOT NULL,
    "metadata" JSONB,
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "FinancialAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialAlert_userId_status_idx" ON "FinancialAlert"("userId", "status");

-- CreateIndex
CREATE INDEX "FinancialAlert_userId_type_idx" ON "FinancialAlert"("userId", "type");

-- CreateIndex
CREATE INDEX "FinancialAlert_userId_severity_idx" ON "FinancialAlert"("userId", "severity");

-- CreateIndex
CREATE INDEX "FinancialAlert_createdAt_idx" ON "FinancialAlert"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAlert_userId_fingerprint_key" ON "FinancialAlert"("userId", "fingerprint");

-- AddForeignKey
ALTER TABLE "FinancialAlert" ADD CONSTRAINT "FinancialAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
