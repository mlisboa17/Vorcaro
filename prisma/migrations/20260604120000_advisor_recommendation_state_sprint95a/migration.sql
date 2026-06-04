-- CreateEnum
CREATE TYPE "AdvisorRecommendationStatus" AS ENUM ('PENDING', 'DISMISSED', 'CLICKED');

-- CreateEnum
CREATE TYPE "DismissReason" AS ENUM ('NOT_RELEVANT', 'ALREADY_HANDLED', 'ACCEPTED_SPENDING', 'REMIND_LATER');

-- CreateTable
CREATE TABLE "AdvisorRecommendationState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recommendationHash" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "status" "AdvisorRecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "dismissReason" "DismissReason",
    "dismissedUntil" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvisorRecommendationState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdvisorRecommendationState_userId_status_idx" ON "AdvisorRecommendationState"("userId", "status");

-- CreateIndex
CREATE INDEX "AdvisorRecommendationState_userId_dismissedUntil_idx" ON "AdvisorRecommendationState"("userId", "dismissedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "AdvisorRecommendationState_userId_recommendationHash_key" ON "AdvisorRecommendationState"("userId", "recommendationHash");

-- AddForeignKey
ALTER TABLE "AdvisorRecommendationState" ADD CONSTRAINT "AdvisorRecommendationState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
