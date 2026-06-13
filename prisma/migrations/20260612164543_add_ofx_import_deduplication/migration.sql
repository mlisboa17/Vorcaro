
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "fitId" TEXT;

-- CreateTable
CREATE TABLE "BankStatementImport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "importHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "transactionsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankStatementImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankStatementImport_userId_idx" ON "BankStatementImport"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BankStatementImport_userId_accountId_importHash_key" ON "BankStatementImport"("userId", "accountId", "importHash");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_userId_accountId_fitId_key" ON "Transaction"("userId", "accountId", "fitId");

-- AddForeignKey
ALTER TABLE "BankStatementImport" ADD CONSTRAINT "BankStatementImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementImport" ADD CONSTRAINT "BankStatementImport_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

