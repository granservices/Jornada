ALTER TYPE "ChatParticipantType" ADD VALUE IF NOT EXISTS 'TEAM';
ALTER TYPE "ChatParticipantType" ADD VALUE IF NOT EXISTS 'EXTERNAL';
ALTER TYPE "ChatMessageSenderType" ADD VALUE IF NOT EXISTS 'TEAM';

CREATE TYPE "SupportTeamStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE "ExternalConversationProvider" AS ENUM ('INTERNAL', 'MICROSOFT_TEAMS', 'EMAIL', 'WHATSAPP');

CREATE TABLE "SupportTeam" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SupportTeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "externalProvider" "ExternalConversationProvider",
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportExternalThread" (
    "id" TEXT NOT NULL,
    "provider" "ExternalConversationProvider" NOT NULL,
    "conversationId" TEXT,
    "supportCaseId" TEXT,
    "externalTenantId" TEXT,
    "externalTeamId" TEXT,
    "externalChannelId" TEXT,
    "externalThreadId" TEXT,
    "externalWebUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportExternalThread_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportTeam_code_key" ON "SupportTeam"("code");
CREATE INDEX "SupportTeam_status_name_idx" ON "SupportTeam"("status", "name");
CREATE INDEX "SupportTeam_externalProvider_externalRef_idx" ON "SupportTeam"("externalProvider", "externalRef");

CREATE UNIQUE INDEX "SupportExternalThread_provider_externalThreadId_key" ON "SupportExternalThread"("provider", "externalThreadId");
CREATE INDEX "SupportExternalThread_conversationId_idx" ON "SupportExternalThread"("conversationId");
CREATE INDEX "SupportExternalThread_supportCaseId_idx" ON "SupportExternalThread"("supportCaseId");
CREATE INDEX "SupportExternalThread_provider_externalTeamId_externalChannelId_idx" ON "SupportExternalThread"("provider", "externalTeamId", "externalChannelId");

ALTER TABLE "ChatConversation" ADD COLUMN "primaryTeamId" TEXT;
ALTER TABLE "ChatConversation" ALTER COLUMN "employeeUserId" DROP NOT NULL;
ALTER TABLE "ChatConversation" ALTER COLUMN "sector" DROP NOT NULL;

ALTER TABLE "ChatParticipant" ADD COLUMN "teamId" TEXT;
ALTER TABLE "ChatParticipant" ADD COLUMN "externalRef" TEXT;

ALTER TABLE "ChatMessage" ADD COLUMN "senderTeamId" TEXT;

ALTER TABLE "SupportCase" ADD COLUMN "currentTeamId" TEXT;

INSERT INTO "SupportTeam" ("id", "code", "name", "status", "createdAt", "updatedAt")
VALUES
  ('team_operations', 'OPERATIONS', 'Operacoes', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('team_medicine', 'MEDICINE', 'Medicina', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('team_training', 'TRAINING', 'Treinamento', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('team_ti', 'TI', 'TI', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('team_support', 'SUPPORT', 'Suporte', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

UPDATE "ChatConversation" conversation
SET "primaryTeamId" = team."id"
FROM "SupportTeam" team
WHERE conversation."sector"::text = team."code";

UPDATE "ChatParticipant" participant
SET "teamId" = team."id",
    "participantType" = 'TEAM',
    "participantKey" = concat('team:', team."id")
FROM "SupportTeam" team
WHERE participant."sector"::text = team."code";

UPDATE "SupportCase" support_case
SET "currentTeamId" = team."id"
FROM "SupportTeam" team
WHERE support_case."currentSector"::text = team."code";

ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_primaryTeamId_fkey" FOREIGN KEY ("primaryTeamId") REFERENCES "SupportTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SupportTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderTeamId_fkey" FOREIGN KEY ("senderTeamId") REFERENCES "SupportTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_currentTeamId_fkey" FOREIGN KEY ("currentTeamId") REFERENCES "SupportTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportExternalThread" ADD CONSTRAINT "SupportExternalThread_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportExternalThread" ADD CONSTRAINT "SupportExternalThread_supportCaseId_fkey" FOREIGN KEY ("supportCaseId") REFERENCES "SupportCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ChatConversation_primaryTeamId_status_updatedAt_idx" ON "ChatConversation"("primaryTeamId", "status", "updatedAt");
CREATE INDEX "ChatParticipant_teamId_leftAt_idx" ON "ChatParticipant"("teamId", "leftAt");
CREATE INDEX "SupportCase_currentTeamId_status_updatedAt_idx" ON "SupportCase"("currentTeamId", "status", "updatedAt");
