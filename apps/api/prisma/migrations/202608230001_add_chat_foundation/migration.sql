CREATE TYPE "ChatSector" AS ENUM ('OPERATIONS', 'MEDICINE', 'TRAINING', 'TI', 'SUPPORT');

CREATE TYPE "ChatConversationStatus" AS ENUM ('OPEN', 'ARCHIVED');

CREATE TYPE "ChatMessageSenderType" AS ENUM ('USER', 'SECTOR', 'SYSTEM');

CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "employeeUserId" TEXT NOT NULL,
    "sector" "ChatSector" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ChatConversationStatus" NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" "ChatMessageSenderType" NOT NULL,
    "senderUserId" TEXT,
    "senderSector" "ChatSector",
    "senderName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "clientMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatReadState" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadMessageId" TEXT,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatReadState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatConversation_employeeUserId_sector_key" ON "ChatConversation"("employeeUserId", "sector");
CREATE INDEX "ChatConversation_employeeUserId_status_updatedAt_idx" ON "ChatConversation"("employeeUserId", "status", "updatedAt");
CREATE INDEX "ChatConversation_sector_updatedAt_idx" ON "ChatConversation"("sector", "updatedAt");

CREATE UNIQUE INDEX "ChatMessage_conversationId_clientMessageId_key" ON "ChatMessage"("conversationId", "clientMessageId");
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");
CREATE INDEX "ChatMessage_senderUserId_createdAt_idx" ON "ChatMessage"("senderUserId", "createdAt");

CREATE UNIQUE INDEX "ChatReadState_conversationId_userId_key" ON "ChatReadState"("conversationId", "userId");
CREATE INDEX "ChatReadState_userId_lastReadAt_idx" ON "ChatReadState"("userId", "lastReadAt");

ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_employeeUserId_fkey" FOREIGN KEY ("employeeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatReadState" ADD CONSTRAINT "ChatReadState_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatReadState" ADD CONSTRAINT "ChatReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
