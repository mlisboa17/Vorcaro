-- PatrimonyLiability: optional rate and dates
ALTER TABLE "PatrimonyLiability" ALTER COLUMN "taxaJuros" DROP NOT NULL;
ALTER TABLE "PatrimonyLiability" ALTER COLUMN "dataContratacao" DROP NOT NULL;
ALTER TABLE "PatrimonyLiability" ALTER COLUMN "dataQuitacaoPrevista" DROP NOT NULL;

-- Transaction.liabilityId
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "liabilityId" TEXT;
CREATE INDEX IF NOT EXISTS "Transaction_liabilityId_idx" ON "Transaction"("liabilityId");
DO $$ BEGIN
  ALTER TABLE "Transaction"
    ADD CONSTRAINT "Transaction_liabilityId_fkey"
    FOREIGN KEY ("liabilityId") REFERENCES "PatrimonyLiability"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- LancamentoRecorrente.liabilityId
ALTER TABLE "LancamentoRecorrente" ADD COLUMN IF NOT EXISTS "liabilityId" TEXT;
CREATE INDEX IF NOT EXISTS "LancamentoRecorrente_liabilityId_idx" ON "LancamentoRecorrente"("liabilityId");
DO $$ BEGIN
  ALTER TABLE "LancamentoRecorrente"
    ADD CONSTRAINT "LancamentoRecorrente_liabilityId_fkey"
    FOREIGN KEY ("liabilityId") REFERENCES "PatrimonyLiability"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
