-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('RECEITA', 'DESPESA');

-- AlterTable: Category.isActive
ALTER TABLE "Category" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Migrate Category.type from TransactionType to CategoryType
ALTER TABLE "Category" ADD COLUMN "type_new" "CategoryType";

UPDATE "Category" SET "type_new" = 'DESPESA' WHERE "type"::text = 'EXPENSE';
UPDATE "Category" SET "type_new" = 'RECEITA' WHERE "type"::text = 'INCOME';
UPDATE "Category" SET "type_new" = 'DESPESA' WHERE "type_new" IS NULL;

ALTER TABLE "Category" DROP COLUMN "type";
ALTER TABLE "Category" RENAME COLUMN "type_new" TO "type";
ALTER TABLE "Category" ALTER COLUMN "type" SET NOT NULL;

-- AlterTable: FinancialInbox.metadata
ALTER TABLE "FinancialInbox" ADD COLUMN "metadata" JSONB;

-- CreateIndex
CREATE INDEX "Category_userId_isActive_idx" ON "Category"("userId", "isActive");
