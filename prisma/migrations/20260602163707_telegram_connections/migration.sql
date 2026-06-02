-- CreateTable
CREATE TABLE "TelegramConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telegramChatId" BIGINT NOT NULL,
    "telegramUserId" BIGINT,
    "username" TEXT,
    "firstName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramConnectCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramConnectCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelegramConnection_userId_idx" ON "TelegramConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramConnection_telegramChatId_key" ON "TelegramConnection"("telegramChatId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramConnectCode_code_key" ON "TelegramConnectCode"("code");

-- CreateIndex
CREATE INDEX "TelegramConnectCode_userId_idx" ON "TelegramConnectCode"("userId");

-- CreateIndex
CREATE INDEX "TelegramConnectCode_expiresAt_idx" ON "TelegramConnectCode"("expiresAt");

-- AddForeignKey
ALTER TABLE "TelegramConnection" ADD CONSTRAINT "TelegramConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramConnectCode" ADD CONSTRAINT "TelegramConnectCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
