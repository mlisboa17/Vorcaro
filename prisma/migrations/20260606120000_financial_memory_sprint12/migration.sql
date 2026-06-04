-- Sprint 12 — Memória Financeira Longitudinal (aditivo: sem EvolutionProfile, cuid, fingerprint)

CREATE TYPE "FinancialTimelineEventType" AS ENUM (
  'NET_WORTH_INCREASE',
  'NET_WORTH_DECREASE',
  'GOAL_PROGRESS',
  'GOAL_COMPLETED',
  'GOAL_AT_RISK',
  'DEBT_REDUCTION',
  'DEBT_INCREASE',
  'CASHFLOW_IMPROVEMENT',
  'CASHFLOW_DETERIORATION',
  'SPENDING_REDUCTION',
  'SPENDING_INCREASE',
  'SUBSCRIPTION_CANCELLED',
  'SUBSCRIPTION_CREATED',
  'MONEY_LEAK_DETECTED',
  'MONEY_LEAK_RESOLVED',
  'MILESTONE'
);

CREATE TYPE "FinancialTimelineImpactLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TYPE "FinancialTrendDirection" AS ENUM ('IMPROVING', 'STABLE', 'DECLINING');

CREATE TABLE "FinancialTimelineEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventType" "FinancialTimelineEventType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "eventDate" TIMESTAMP(3) NOT NULL,
  "impactLevel" "FinancialTimelineImpactLevel" NOT NULL,
  "metadata" JSONB,
  "fingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialMetricSnapshot" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "snapshotDate" DATE NOT NULL,
  "healthScore" INTEGER NOT NULL,
  "netWorth" DECIMAL(15,2) NOT NULL,
  "totalDebt" DECIMAL(15,2) NOT NULL,
  "monthlyIncome" DECIMAL(15,2) NOT NULL,
  "monthlyExpenses" DECIMAL(15,2) NOT NULL,
  "monthlyCashflow" DECIMAL(15,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialMetricSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialAchievement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "achievementKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  CONSTRAINT "FinancialAchievement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialTimelineEvent_userId_fingerprint_key" ON "FinancialTimelineEvent"("userId", "fingerprint");
CREATE INDEX "FinancialTimelineEvent_userId_eventDate_idx" ON "FinancialTimelineEvent"("userId", "eventDate");
CREATE INDEX "FinancialTimelineEvent_userId_eventType_idx" ON "FinancialTimelineEvent"("userId", "eventType");

CREATE UNIQUE INDEX "FinancialMetricSnapshot_userId_snapshotDate_key" ON "FinancialMetricSnapshot"("userId", "snapshotDate");
CREATE INDEX "FinancialMetricSnapshot_userId_snapshotDate_idx" ON "FinancialMetricSnapshot"("userId", "snapshotDate");

CREATE UNIQUE INDEX "FinancialAchievement_userId_achievementKey_key" ON "FinancialAchievement"("userId", "achievementKey");
CREATE INDEX "FinancialAchievement_userId_unlockedAt_idx" ON "FinancialAchievement"("userId", "unlockedAt");

ALTER TABLE "FinancialTimelineEvent" ADD CONSTRAINT "FinancialTimelineEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialMetricSnapshot" ADD CONSTRAINT "FinancialMetricSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAchievement" ADD CONSTRAINT "FinancialAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
