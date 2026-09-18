CREATE TYPE "ChatConversationKind" AS ENUM ('DIRECT', 'TEAM', 'SUPPORT');

CREATE TYPE "ChatParticipantType" AS ENUM ('USER', 'SECTOR');

CREATE TYPE "ChatParticipantRole" AS ENUM ('REQUESTER', 'MEMBER', 'AGENT', 'OBSERVER');

CREATE TYPE "SupportCaseStatus" AS ENUM ('NEW', 'OPEN', 'WAITING_REQUESTER', 'WAITING_INTERNAL', 'RESOLVED', 'CLOSED');

CREATE TYPE "SupportCasePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

CREATE TYPE "SupportCaseOrigin" AS ENUM ('CHAT', 'MANUAL', 'INTEGRATION');

CREATE TYPE "SupportCaseEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'TRANSFERRED', 'COMMENTED', 'LINKED_MESSAGE');

ALTER TABLE "ChatConversation" ADD COLUMN "kind" "ChatConversationKind" NOT NULL DEFAULT 'SUPPORT';

CREATE TABLE "ChatParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "participantType" "ChatParticipantType" NOT NULL,
    "participantKey" TEXT NOT NULL,
    "userId" TEXT,
    "sector" "ChatSector",
    "role" "ChatParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "mutedAt" TIMESTAMP(3),

    CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportCase" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SupportCaseStatus" NOT NULL DEFAULT 'NEW',
    "priority" "SupportCasePriority" NOT NULL DEFAULT 'NORMAL',
    "origin" "SupportCaseOrigin" NOT NULL DEFAULT 'CHAT',
    "requesterUserId" TEXT NOT NULL,
    "currentSector" "ChatSector",
    "assignedUserId" TEXT,
    "originConversationId" TEXT,
    "originMessageId" TEXT,
    "dueAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportCaseEvent" (
    "id" TEXT NOT NULL,
    "supportCaseId" TEXT NOT NULL,
    "eventType" "SupportCaseEventType" NOT NULL,
    "authorUserId" TEXT,
    "fromValue" TEXT,
    "toValue" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportCaseEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatParticipant_conversationId_participantKey_key" ON "ChatParticipant"("conversationId", "participantKey");
CREATE INDEX "ChatParticipant_userId_leftAt_idx" ON "ChatParticipant"("userId", "leftAt");
CREATE INDEX "ChatParticipant_sector_leftAt_idx" ON "ChatParticipant"("sector", "leftAt");
CREATE INDEX "ChatParticipant_participantType_participantKey_idx" ON "ChatParticipant"("participantType", "participantKey");

CREATE UNIQUE INDEX "SupportCase_code_key" ON "SupportCase"("code");
CREATE INDEX "SupportCase_requesterUserId_status_updatedAt_idx" ON "SupportCase"("requesterUserId", "status", "updatedAt");
CREATE INDEX "SupportCase_currentSector_status_updatedAt_idx" ON "SupportCase"("currentSector", "status", "updatedAt");
CREATE INDEX "SupportCase_assignedUserId_status_updatedAt_idx" ON "SupportCase"("assignedUserId", "status", "updatedAt");
CREATE INDEX "SupportCase_originConversationId_idx" ON "SupportCase"("originConversationId");

CREATE INDEX "SupportCaseEvent_supportCaseId_createdAt_idx" ON "SupportCaseEvent"("supportCaseId", "createdAt");
CREATE INDEX "SupportCaseEvent_authorUserId_createdAt_idx" ON "SupportCaseEvent"("authorUserId", "createdAt");
CREATE INDEX "SupportCaseEvent_eventType_createdAt_idx" ON "SupportCaseEvent"("eventType", "createdAt");

CREATE INDEX "ChatConversation_kind_status_updatedAt_idx" ON "ChatConversation"("kind", "status", "updatedAt");

ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_originConversationId_fkey" FOREIGN KEY ("originConversationId") REFERENCES "ChatConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_originMessageId_fkey" FOREIGN KEY ("originMessageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportCaseEvent" ADD CONSTRAINT "SupportCaseEvent_supportCaseId_fkey" FOREIGN KEY ("supportCaseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportCaseEvent" ADD CONSTRAINT "SupportCaseEvent_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ChatParticipant" (
  "id",
  "conversationId",
  "participantType",
  "participantKey",
  "userId",
  "role",
  "joinedAt"
)
SELECT
  concat('cp_user_', "id"),
  "id",
  'USER',
  concat('user:', "employeeUserId"),
  "employeeUserId",
  'REQUESTER',
  "createdAt"
FROM "ChatConversation"
ON CONFLICT ("conversationId", "participantKey") DO NOTHING;

INSERT INTO "ChatParticipant" (
  "id",
  "conversationId",
  "participantType",
  "participantKey",
  "sector",
  "role",
  "joinedAt"
)
SELECT
  concat('cp_sector_', "id"),
  "id",
  'SECTOR',
  concat('sector:', "sector"::text),
  "sector",
  'AGENT',
  "createdAt"
FROM "ChatConversation"
ON CONFLICT ("conversationId", "participantKey") DO NOTHING;
