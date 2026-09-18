-- Add per-topic support case opening policy.
CREATE TYPE "SupportCaseOpeningPolicy" AS ENUM (
  'CONTINUOUS_CONVERSATION',
  'INDIVIDUAL_REQUEST',
  'BUSINESS_KEY'
);

ALTER TABLE "SupportTopic"
  ADD COLUMN "openingPolicy" "SupportCaseOpeningPolicy" NOT NULL DEFAULT 'CONTINUOUS_CONVERSATION',
  ADD COLUMN "businessKeyFieldCode" TEXT;

ALTER TABLE "SupportCase"
  ADD COLUMN "businessKey" TEXT;

CREATE INDEX "SupportCase_requesterUserId_topicId_businessKey_status_idx"
  ON "SupportCase"("requesterUserId", "topicId", "businessKey", "status");
