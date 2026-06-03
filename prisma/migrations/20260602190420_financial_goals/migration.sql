-- CreateEnum
CREATE TYPE "FinancialGoalType" AS ENUM ('EMERGENCY_FUND', 'VEHICLE', 'REAL_ESTATE', 'DEBT_SETTLEMENT', 'EDUCATION', 'RETIREMENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GoalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "FinancialGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "FinancialGoalType" NOT NULL,
    "valorObjetivo" DECIMAL(15,2) NOT NULL,
    "valorAtual" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "aporteMensal" DECIMAL(15,2),
    "dataObjetivo" TIMESTAMP(3),
    "prioridade" "GoalPriority" NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialGoal_userId_idx" ON "FinancialGoal"("userId");

-- CreateIndex
CREATE INDEX "FinancialGoal_userId_status_idx" ON "FinancialGoal"("userId", "status");

-- AddForeignKey
ALTER TABLE "FinancialGoal" ADD CONSTRAINT "FinancialGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
