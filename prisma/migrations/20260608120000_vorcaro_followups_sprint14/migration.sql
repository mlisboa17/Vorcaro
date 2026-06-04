-- Sprint 14 — Follow-up Inteligente e Pendências Ativas

CREATE TYPE "VorcaroFollowUpStatus" AS ENUM (
  'PENDING',
  'ACTIVE',
  'COMPLETED',
  'DISMISSED',
  'EXPIRED'
);

CREATE TABLE "VorcaroFollowUp" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "relatedEntityId" TEXT,
  "relatedEntityType" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "VorcaroFollowUpStatus" NOT NULL DEFAULT 'PENDING',
  "nextCheckAt" TIMESTAMP(3) NOT NULL,
  "lastReminderAt" TIMESTAMP(3),
  "checkCount" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VorcaroFollowUp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VorcaroFollowUp_userId_fingerprint_key" ON "VorcaroFollowUp"("userId", "fingerprint");
CREATE INDEX "VorcaroFollowUp_userId_status_idx" ON "VorcaroFollowUp"("userId", "status");
CREATE INDEX "VorcaroFollowUp_nextCheckAt_idx" ON "VorcaroFollowUp"("nextCheckAt");

ALTER TABLE "VorcaroFollowUp"
  ADD CONSTRAINT "VorcaroFollowUp_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
