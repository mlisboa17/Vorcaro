-- CreateEnum
CREATE TYPE "FrequenciaRecorrencia" AS ENUM ('SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "TipoLancamentoRecorrente" AS ENUM ('RECEITA', 'DESPESA');

-- AlterTable Transaction: campos de data efetiva e recorrência
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "dataCompra" TIMESTAMP(3);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "dataCaixa" TIMESTAMP(3);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "dataVencimentoFatura" TIMESTAMP(3);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "numeroParcela" INTEGER;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "totalParcelas" INTEGER;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "idGrupoParcelamento" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "observacoesInternas" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "lancamentoRecorrenteId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "dataRecorrencia" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LancamentoRecorrente" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" "TipoLancamentoRecorrente" NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "frequencia" "FrequenciaRecorrencia" NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "proximaExecucao" TIMESTAMP(3) NOT NULL,
    "estaAtivo" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "cardId" TEXT,
    "observacoes" TEXT,
    "diaInicioOriginal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LancamentoRecorrente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LancamentoRecorrente_userId_estaAtivo_proximaExecucao_idx" ON "LancamentoRecorrente"("userId", "estaAtivo", "proximaExecucao");
CREATE INDEX IF NOT EXISTS "LancamentoRecorrente_userId_idx" ON "LancamentoRecorrente"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_lancamentoRecorrenteId_dataRecorrencia_idx" ON "Transaction"("lancamentoRecorrenteId", "dataRecorrencia");

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "LancamentoRecorrente" ADD CONSTRAINT "LancamentoRecorrente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "LancamentoRecorrente" ADD CONSTRAINT "LancamentoRecorrente_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "LancamentoRecorrente" ADD CONSTRAINT "LancamentoRecorrente_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "LancamentoRecorrente" ADD CONSTRAINT "LancamentoRecorrente_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "LancamentoRecorrente" ADD CONSTRAINT "LancamentoRecorrente_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_lancamentoRecorrenteId_fkey" FOREIGN KEY ("lancamentoRecorrenteId") REFERENCES "LancamentoRecorrente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
