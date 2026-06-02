-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('VEHICLE', 'REAL_ESTATE', 'INVESTMENT', 'CONSORTIUM', 'RECEIVABLE', 'OTHER');

-- CreateEnum
CREATE TYPE "LiabilityType" AS ENUM ('FINANCING', 'LOAN', 'CREDIT_LINE', 'OTHER');

-- CreateEnum
CREATE TYPE "PatrimonyTxType" AS ENUM ('APORTE', 'RESGATE', 'AMORTIZACAO', 'JUROS', 'SEGURO', 'TAXA', 'CORRECAO', 'RENDIMENTO', 'DEPRECIACAO');

-- CreateTable
CREATE TABLE "PatrimonyLiability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "LiabilityType" NOT NULL,
    "saldoOriginal" DECIMAL(15,2) NOT NULL,
    "saldoAtual" DECIMAL(15,2) NOT NULL,
    "taxaJuros" DECIMAL(8,4) NOT NULL,
    "dataContratacao" TIMESTAMP(3) NOT NULL,
    "dataQuitacaoPrevista" TIMESTAMP(3) NOT NULL,
    "estaAtivo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatrimonyLiability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatrimonyAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "AssetType" NOT NULL,
    "valorAquisicao" DECIMAL(15,2) NOT NULL,
    "valorAtual" DECIMAL(15,2) NOT NULL,
    "dataAquisicao" TIMESTAMP(3) NOT NULL,
    "estaAtivo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "liabilityId" TEXT,

    CONSTRAINT "PatrimonyAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatrimonyTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT,
    "liabilityId" TEXT,
    "tipo" "PatrimonyTxType" NOT NULL,
    "valorTotal" DECIMAL(15,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT,
    "mainTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatrimonyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatrimonyAsset_liabilityId_key" ON "PatrimonyAsset"("liabilityId");

-- CreateIndex
CREATE INDEX "PatrimonyAsset_userId_estaAtivo_idx" ON "PatrimonyAsset"("userId", "estaAtivo");

-- CreateIndex
CREATE INDEX "PatrimonyAsset_userId_tipo_idx" ON "PatrimonyAsset"("userId", "tipo");

-- CreateIndex
CREATE INDEX "PatrimonyLiability_userId_estaAtivo_idx" ON "PatrimonyLiability"("userId", "estaAtivo");

-- CreateIndex
CREATE INDEX "PatrimonyLiability_userId_tipo_idx" ON "PatrimonyLiability"("userId", "tipo");

-- CreateIndex
CREATE INDEX "PatrimonyTransaction_userId_data_idx" ON "PatrimonyTransaction"("userId", "data");

-- CreateIndex
CREATE INDEX "PatrimonyTransaction_assetId_idx" ON "PatrimonyTransaction"("assetId");

-- CreateIndex
CREATE INDEX "PatrimonyTransaction_liabilityId_idx" ON "PatrimonyTransaction"("liabilityId");

-- CreateIndex
CREATE INDEX "PatrimonyTransaction_mainTransactionId_idx" ON "PatrimonyTransaction"("mainTransactionId");

-- AddForeignKey
ALTER TABLE "PatrimonyAsset" ADD CONSTRAINT "PatrimonyAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrimonyAsset" ADD CONSTRAINT "PatrimonyAsset_liabilityId_fkey" FOREIGN KEY ("liabilityId") REFERENCES "PatrimonyLiability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrimonyLiability" ADD CONSTRAINT "PatrimonyLiability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrimonyTransaction" ADD CONSTRAINT "PatrimonyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrimonyTransaction" ADD CONSTRAINT "PatrimonyTransaction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "PatrimonyAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrimonyTransaction" ADD CONSTRAINT "PatrimonyTransaction_liabilityId_fkey" FOREIGN KEY ("liabilityId") REFERENCES "PatrimonyLiability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrimonyTransaction" ADD CONSTRAINT "PatrimonyTransaction_mainTransactionId_fkey" FOREIGN KEY ("mainTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
