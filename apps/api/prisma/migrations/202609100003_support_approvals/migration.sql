-- Add support approval workflow foundation.
ALTER TYPE "SupportCaseStatus" ADD VALUE IF NOT EXISTS 'WAITING_APPROVAL';
ALTER TYPE "SupportCaseEventType" ADD VALUE IF NOT EXISTS 'APPROVAL_REQUESTED';
ALTER TYPE "SupportCaseEventType" ADD VALUE IF NOT EXISTS 'APPROVAL_DECIDED';
ALTER TYPE "SupportCaseEventType" ADD VALUE IF NOT EXISTS 'APPROVAL_CHANGES_REQUESTED';
ALTER TYPE "SupportCaseEventType" ADD VALUE IF NOT EXISTS 'APPROVAL_CANCELLED';

CREATE TYPE "ApprovalRequestStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED',
  'CANCELLED',
  'EXPIRED'
);

CREATE TYPE "ApprovalStepStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED',
  'CANCELLED',
  'EXPIRED'
);

CREATE TYPE "ApprovalEventType" AS ENUM (
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED',
  'RESUBMITTED',
  'CANCELLED',
  'EXPIRED',
  'COMMENTED'
);

CREATE TYPE "SupportResponsibilityOwnerType" AS ENUM (
  'SUPPORT_TEAM',
  'REQUESTER',
  'APPROVAL_TEAM',
  'EXTERNAL'
);

CREATE TABLE "ApprovalRule" (
  "id" TEXT NOT NULL,
  "departmentId" TEXT,
  "topicId" TEXT,
  "formId" TEXT,
  "approvalTeamId" TEXT NOT NULL,
  "status" "SupportCatalogStatus" NOT NULL DEFAULT 'ACTIVE',
  "priority" INTEGER NOT NULL DEFAULT 100,
  "conditions" JSONB,
  "defaultDueMinutes" INTEGER,
  "manualTriggerAllowed" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovalRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalRequest" (
  "id" TEXT NOT NULL,
  "supportCaseId" TEXT NOT NULL,
  "ruleId" TEXT,
  "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'PENDING',
  "requestedByUserId" TEXT,
  "currentStepId" TEXT,
  "reason" TEXT,
  "dueAt" TIMESTAMP(3),
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalStep" (
  "id" TEXT NOT NULL,
  "approvalRequestId" TEXT NOT NULL,
  "approvalTeamId" TEXT NOT NULL,
  "stepOrder" INTEGER NOT NULL DEFAULT 1,
  "status" "ApprovalStepStatus" NOT NULL DEFAULT 'PENDING',
  "dueAt" TIMESTAMP(3),
  "decidedByUserId" TEXT,
  "decidedAt" TIMESTAMP(3),
  "decisionComment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalEvent" (
  "id" TEXT NOT NULL,
  "approvalRequestId" TEXT NOT NULL,
  "approvalStepId" TEXT,
  "eventType" "ApprovalEventType" NOT NULL,
  "authorUserId" TEXT,
  "comment" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportResponsibilityPeriod" (
  "id" TEXT NOT NULL,
  "supportCaseId" TEXT NOT NULL,
  "ownerType" "SupportResponsibilityOwnerType" NOT NULL,
  "ownerTeamId" TEXT,
  "approvalRequestId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "reason" TEXT,
  CONSTRAINT "SupportResponsibilityPeriod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApprovalRequest_currentStepId_key" ON "ApprovalRequest"("currentStepId");
CREATE INDEX "ApprovalRule_departmentId_topicId_status_priority_idx" ON "ApprovalRule"("departmentId", "topicId", "status", "priority");
CREATE INDEX "ApprovalRule_formId_status_priority_idx" ON "ApprovalRule"("formId", "status", "priority");
CREATE INDEX "ApprovalRule_approvalTeamId_status_idx" ON "ApprovalRule"("approvalTeamId", "status");
CREATE INDEX "ApprovalRequest_supportCaseId_status_updatedAt_idx" ON "ApprovalRequest"("supportCaseId", "status", "updatedAt");
CREATE INDEX "ApprovalRequest_status_dueAt_idx" ON "ApprovalRequest"("status", "dueAt");
CREATE INDEX "ApprovalRequest_ruleId_status_idx" ON "ApprovalRequest"("ruleId", "status");
CREATE INDEX "ApprovalStep_approvalTeamId_status_dueAt_idx" ON "ApprovalStep"("approvalTeamId", "status", "dueAt");
CREATE INDEX "ApprovalStep_approvalRequestId_stepOrder_idx" ON "ApprovalStep"("approvalRequestId", "stepOrder");
CREATE INDEX "ApprovalStep_decidedByUserId_decidedAt_idx" ON "ApprovalStep"("decidedByUserId", "decidedAt");
CREATE INDEX "ApprovalEvent_approvalRequestId_createdAt_idx" ON "ApprovalEvent"("approvalRequestId", "createdAt");
CREATE INDEX "ApprovalEvent_approvalStepId_createdAt_idx" ON "ApprovalEvent"("approvalStepId", "createdAt");
CREATE INDEX "ApprovalEvent_eventType_createdAt_idx" ON "ApprovalEvent"("eventType", "createdAt");
CREATE INDEX "SupportResponsibilityPeriod_supportCaseId_startedAt_idx" ON "SupportResponsibilityPeriod"("supportCaseId", "startedAt");
CREATE INDEX "SupportResponsibilityPeriod_ownerTeamId_ownerType_endedAt_idx" ON "SupportResponsibilityPeriod"("ownerTeamId", "ownerType", "endedAt");
CREATE INDEX "SupportResponsibilityPeriod_approvalRequestId_idx" ON "SupportResponsibilityPeriod"("approvalRequestId");

ALTER TABLE "ApprovalRule" ADD CONSTRAINT "ApprovalRule_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "SupportDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRule" ADD CONSTRAINT "ApprovalRule_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SupportTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRule" ADD CONSTRAINT "ApprovalRule_formId_fkey" FOREIGN KEY ("formId") REFERENCES "SupportTopicForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalRule" ADD CONSTRAINT "ApprovalRule_approvalTeamId_fkey" FOREIGN KEY ("approvalTeamId") REFERENCES "SupportTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_supportCaseId_fkey" FOREIGN KEY ("supportCaseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ApprovalRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_currentStepId_fkey" FOREIGN KEY ("currentStepId") REFERENCES "ApprovalStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approvalTeamId_fkey" FOREIGN KEY ("approvalTeamId") REFERENCES "SupportTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalEvent" ADD CONSTRAINT "ApprovalEvent_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalEvent" ADD CONSTRAINT "ApprovalEvent_approvalStepId_fkey" FOREIGN KEY ("approvalStepId") REFERENCES "ApprovalStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalEvent" ADD CONSTRAINT "ApprovalEvent_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportResponsibilityPeriod" ADD CONSTRAINT "SupportResponsibilityPeriod_supportCaseId_fkey" FOREIGN KEY ("supportCaseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportResponsibilityPeriod" ADD CONSTRAINT "SupportResponsibilityPeriod_ownerTeamId_fkey" FOREIGN KEY ("ownerTeamId") REFERENCES "SupportTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportResponsibilityPeriod" ADD CONSTRAINT "SupportResponsibilityPeriod_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
