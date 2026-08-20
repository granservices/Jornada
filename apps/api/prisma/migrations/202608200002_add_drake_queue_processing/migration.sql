-- AlterEnum
ALTER TYPE "IntegrationInboxStatus" ADD VALUE IF NOT EXISTS 'QUEUED';
ALTER TYPE "IntegrationInboxStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "IntegrationInboxStatus" ADD VALUE IF NOT EXISTS 'PROCESSED';
ALTER TYPE "IntegrationInboxStatus" ADD VALUE IF NOT EXISTS 'FAILED';

-- AlterTable
ALTER TABLE "DrakeWebhookInboxEvent"
ADD COLUMN "processingAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastQueuedAt" TIMESTAMP(3),
ADD COLUMN "processingStartedAt" TIMESTAMP(3),
ADD COLUMN "processedAt" TIMESTAMP(3),
ADD COLUMN "failedAt" TIMESTAMP(3),
ADD COLUMN "lastError" TEXT;

-- CreateIndex
CREATE INDEX "DrakeWebhookInboxEvent_status_createdAt_idx"
ON "DrakeWebhookInboxEvent"("status", "createdAt");
