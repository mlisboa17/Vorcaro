-- CreateEnum
CREATE TYPE "VorcaroTone" AS ENUM ('PROFESSIONAL', 'DIRECT', 'VORCARO', 'IMPACT', 'REALITY_AUDITOR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "vorcaroTone" "VorcaroTone" NOT NULL DEFAULT 'PROFESSIONAL';

-- CreateTable
CREATE TABLE "VorcaroMessageHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tone" "VorcaroTone" NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VorcaroMessageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VorcaroMessageHistory_userId_usedAt_idx" ON "VorcaroMessageHistory"("userId", "usedAt");

-- CreateIndex
CREATE INDEX "VorcaroMessageHistory_userId_templateId_idx" ON "VorcaroMessageHistory"("userId", "templateId");

-- CreateIndex
CREATE INDEX "VorcaroMessageHistory_userId_category_idx" ON "VorcaroMessageHistory"("userId", "category");

-- AddForeignKey
ALTER TABLE "VorcaroMessageHistory" ADD CONSTRAINT "VorcaroMessageHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
