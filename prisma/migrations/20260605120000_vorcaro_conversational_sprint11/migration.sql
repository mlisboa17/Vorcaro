-- Sprint 11: Vorcaro conversacional

CREATE TYPE "VorcaroConversationChannel" AS ENUM ('WEB', 'TELEGRAM');
CREATE TYPE "VorcaroMessageRole" AS ENUM ('USER', 'VORCARO', 'SYSTEM');

CREATE TABLE "VorcaroConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "VorcaroConversationChannel" NOT NULL,
    "title" TEXT,
    "activeTopic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VorcaroConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VorcaroMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "VorcaroMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VorcaroMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VorcaroConversation_userId_channel_idx" ON "VorcaroConversation"("userId", "channel");
CREATE INDEX "VorcaroConversation_userId_updatedAt_idx" ON "VorcaroConversation"("userId", "updatedAt");
CREATE INDEX "VorcaroMessage_conversationId_createdAt_idx" ON "VorcaroMessage"("conversationId", "createdAt");

ALTER TABLE "VorcaroConversation" ADD CONSTRAINT "VorcaroConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VorcaroMessage" ADD CONSTRAINT "VorcaroMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "VorcaroConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
