-- Sprint 7.5 — Contas a Receber e Reembolsos

CREATE TYPE "ReceivableStatus" AS ENUM ('OPEN', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

CREATE TABLE "Receivable" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "devedorNome" TEXT NOT NULL,
    "valorOriginal" DECIMAL(15,2) NOT NULL,
    "valorRecebido" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "valorPendente" DECIMAL(15,2) NOT NULL,
    "status" "ReceivableStatus" NOT NULL DEFAULT 'OPEN',
    "origem" TEXT,
    "observacoes" TEXT,
    "expectedDate" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receivable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Receivable_transactionId_key" ON "Receivable"("transactionId");
CREATE INDEX "Receivable_userId_idx" ON "Receivable"("userId");
CREATE INDEX "Receivable_status_idx" ON "Receivable"("status");
CREATE INDEX "Receivable_userId_expectedDate_idx" ON "Receivable"("userId", "expectedDate");

ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
