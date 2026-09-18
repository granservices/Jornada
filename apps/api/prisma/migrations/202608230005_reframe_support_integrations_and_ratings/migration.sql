ALTER TYPE "ExternalConversationProvider" RENAME TO "SupportIntegrationProvider";

ALTER TABLE "SupportTeam" RENAME COLUMN "externalProvider" TO "notificationProvider";
ALTER TABLE "SupportTeam" RENAME COLUMN "externalRef" TO "notificationRef";
ALTER INDEX "SupportTeam_externalProvider_externalRef_idx" RENAME TO "SupportTeam_notificationProvider_notificationRef_idx";

ALTER TABLE "SupportExternalThread" RENAME TO "SupportIntegrationLink";
ALTER TABLE "SupportIntegrationLink" RENAME COLUMN "externalTeamId" TO "externalWorkspaceId";
ALTER TABLE "SupportIntegrationLink" RENAME COLUMN "externalThreadId" TO "externalReference";
ALTER TABLE "SupportIntegrationLink" RENAME COLUMN "externalWebUrl" TO "externalUrl";
ALTER TABLE "SupportIntegrationLink" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'NOTIFICATION';

ALTER TABLE "SupportIntegrationLink" RENAME CONSTRAINT "SupportExternalThread_pkey" TO "SupportIntegrationLink_pkey";
ALTER TABLE "SupportIntegrationLink" RENAME CONSTRAINT "SupportExternalThread_conversationId_fkey" TO "SupportIntegrationLink_conversationId_fkey";
ALTER TABLE "SupportIntegrationLink" RENAME CONSTRAINT "SupportExternalThread_supportCaseId_fkey" TO "SupportIntegrationLink_supportCaseId_fkey";

ALTER INDEX "SupportExternalThread_provider_externalThreadId_key" RENAME TO "SupportIntegrationLink_provider_externalReference_key";
ALTER INDEX "SupportExternalThread_conversationId_idx" RENAME TO "SupportIntegrationLink_conversationId_idx";
ALTER INDEX "SupportExternalThread_supportCaseId_idx" RENAME TO "SupportIntegrationLink_supportCaseId_idx";
ALTER INDEX "SupportExternalThread_provider_externalTeamId_externalChannelId_idx" RENAME TO "SupportIntegrationLink_provider_externalWorkspaceId_externalChannelId_idx";
CREATE INDEX "SupportIntegrationLink_provider_purpose_idx" ON "SupportIntegrationLink"("provider", "purpose");

CREATE TABLE "SupportRating" (
    "id" TEXT NOT NULL,
    "supportCaseId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportRating_supportCaseId_key" ON "SupportRating"("supportCaseId");
CREATE INDEX "SupportRating_reviewerUserId_createdAt_idx" ON "SupportRating"("reviewerUserId", "createdAt");
CREATE INDEX "SupportRating_score_createdAt_idx" ON "SupportRating"("score", "createdAt");

ALTER TABLE "SupportRating" ADD CONSTRAINT "SupportRating_supportCaseId_fkey" FOREIGN KEY ("supportCaseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportRating" ADD CONSTRAINT "SupportRating_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
