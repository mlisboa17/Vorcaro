-- CreateEnum
CREATE TYPE "BankStatementLayoutApprovalStatus" AS ENUM ('TESTING', 'APPROVED', 'DISABLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BankStatementLayoutRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "BankStatementLayoutModel"
  ADD COLUMN "approvalStatus" "BankStatementLayoutApprovalStatus" NOT NULL DEFAULT 'TESTING',
  ADD COLUMN "riskLevel" "BankStatementLayoutRiskLevel" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "humanReviewConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "realImportCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "BankStatementLayoutModel_userId_approvalStatus_idx" ON "BankStatementLayoutModel"("userId", "approvalStatus");
