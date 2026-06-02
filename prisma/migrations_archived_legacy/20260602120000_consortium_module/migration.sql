-- CreateEnum
CREATE TYPE "ConsortiumType" AS ENUM ('VEHICLE', 'REAL_ESTATE', 'SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "ConsortiumStatus" AS ENUM ('NOT_CONTEMPLATED', 'CONTEMPLATED', 'ASSET_ACQUIRED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Consortium" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "ConsortiumType" NOT NULL,
    "status" "ConsortiumStatus" NOT NULL,
    "valorCredito" DECIMAL(15,2) NOT NULL,
    "valorLance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "valorPago" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "valorTaxas" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "quantidadeParcelas" INTEGER NOT NULL,
    "parcelasPagas" INTEGER NOT NULL DEFAULT 0,
    "dataContratacao" TIMESTAMP(3),
    "dataContemplacao" TIMESTAMP(3),
    "dataQuitacao" TIMESTAMP(3),
    "assetId" TEXT,
    "lancamentoRecorrenteId" TEXT,
    "estaAtivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consortium_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Consortium_assetId_key" ON "Consortium"("assetId");

-- CreateIndex
CREATE INDEX "Consortium_userId_idx" ON "Consortium"("userId");

-- CreateIndex
CREATE INDEX "Consortium_userId_estaAtivo_idx" ON "Consortium"("userId", "estaAtivo");

-- CreateIndex
CREATE INDEX "Consortium_userId_status_idx" ON "Consortium"("userId", "status");

-- AddForeignKey
ALTER TABLE "Consortium" ADD CONSTRAINT "Consortium_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consortium" ADD CONSTRAINT "Consortium_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "PatrimonyAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consortium" ADD CONSTRAINT "Consortium_lancamentoRecorrenteId_fkey" FOREIGN KEY ("lancamentoRecorrenteId") REFERENCES "LancamentoRecorrente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
