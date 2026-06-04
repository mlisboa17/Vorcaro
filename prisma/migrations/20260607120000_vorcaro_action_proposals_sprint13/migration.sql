-- Sprint 13 — Execução Assistida Vorcaro (Assist → Confirm → Execute)

CREATE TYPE "VorcaroActionStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXECUTED',
  'FAILED',
  'EXPIRED'
);

CREATE TABLE "VorcaroActionProposal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "VorcaroActionStatus" NOT NULL DEFAULT 'PENDING',
  "approvedAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VorcaroActionProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VorcaroActionProposal_userId_idx" ON "VorcaroActionProposal"("userId");
CREATE INDEX "VorcaroActionProposal_status_idx" ON "VorcaroActionProposal"("status");

ALTER TABLE "VorcaroActionProposal"
  ADD CONSTRAINT "VorcaroActionProposal_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
