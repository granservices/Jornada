-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'BLOCKED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ApplicationEntryKind" AS ENUM ('NATIVE', 'REDIRECT');

-- CreateEnum
CREATE TYPE "UserApplicationAccessStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "ApplicationRoleCode" AS ENUM ('USER', 'AGENT', 'MANAGER', 'ADMIN', 'MEMBER', 'REQUESTER', 'VIEWER', 'AUTHOR', 'PUBLISHER');

-- CreateEnum
CREATE TYPE "AccessChangeReason" AS ENUM ('ONBOARDING', 'ROLE_CHANGE', 'SECURITY', 'OFFBOARDING', 'ACCESS_CORRECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "UserApplicationRoleStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'ADMIN', 'SUPPORT', 'TI', 'MEDICINE', 'OPERATIONS');

-- CreateEnum
CREATE TYPE "AuthAuditEventType" AS ENUM ('REGISTER', 'LOGIN', 'REFRESH', 'LOGOUT', 'FORGOT_PASSWORD', 'RESET_PASSWORD', 'SSO_TICKET_ISSUED', 'SSO_TICKET_CONSUMED');

-- CreateEnum
CREATE TYPE "AuthAuditOutcome" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateEnum
CREATE TYPE "IntegrationInboxStatus" AS ENUM ('RECEIVED', 'QUEUED', 'PROCESSING', 'PROCESSED', 'FAILED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "DomainEventOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "ChatSector" AS ENUM ('OPERATIONS', 'MEDICINE', 'TRAINING', 'TI', 'SUPPORT');

-- CreateEnum
CREATE TYPE "ChatConversationStatus" AS ENUM ('OPEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ChatConversationKind" AS ENUM ('DIRECT', 'TEAM', 'SUPPORT');

-- CreateEnum
CREATE TYPE "ChatParticipantType" AS ENUM ('USER', 'TEAM', 'SECTOR', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "ChatParticipantRole" AS ENUM ('REQUESTER', 'MEMBER', 'AGENT', 'OBSERVER');

-- CreateEnum
CREATE TYPE "ChatMessageSenderType" AS ENUM ('USER', 'TEAM', 'SECTOR', 'SYSTEM', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "SupportTeamStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SupportCatalogStatus" AS ENUM ('ACTIVE', 'DRAFT', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SupportCaseOpeningPolicy" AS ENUM ('CONTINUOUS_CONVERSATION', 'INDIVIDUAL_REQUEST', 'BUSINESS_KEY');

-- CreateEnum
CREATE TYPE "SupportFormFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'SELECT', 'DATE', 'BOOLEAN', 'NUMBER', 'FILE');

-- CreateEnum
CREATE TYPE "FormOwnerType" AS ENUM ('GLOBAL', 'SUPPORT_DEPARTMENT');

-- CreateEnum
CREATE TYPE "FormRequestStatus" AS ENUM ('PENDING', 'SUBMITTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OptionSourceAdapterType" AS ENUM ('STATIC', 'HTTP_JSON');

-- CreateEnum
CREATE TYPE "OptionSourceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SupportTriageSuggestionSource" AS ENUM ('RULE', 'LOCAL_AI', 'EXTERNAL_AI');

-- CreateEnum
CREATE TYPE "SupportIntegrationProvider" AS ENUM ('INTERNAL', 'MICROSOFT_TEAMS', 'EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "SupportCaseStatus" AS ENUM ('NEW', 'OPEN', 'WAITING_REQUESTER', 'WAITING_INTERNAL', 'WAITING_APPROVAL', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportCasePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SupportCaseOrigin" AS ENUM ('CHAT', 'MANUAL', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "SupportCaseEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'TRANSFERRED', 'COMMENTED', 'LINKED_MESSAGE', 'APPROVAL_REQUESTED', 'APPROVAL_DECIDED', 'APPROVAL_CHANGES_REQUESTED', 'APPROVAL_CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApprovalStepStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApprovalEventType" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'RESUBMITTED', 'CANCELLED', 'EXPIRED', 'COMMENTED');

-- CreateEnum
CREATE TYPE "SupportResponsibilityOwnerType" AS ENUM ('SUPPORT_TEAM', 'REQUESTER', 'APPROVAL_TEAM', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('READ', 'CREATE', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'PUBLISH', 'SAVE_DRAFT', 'LINK', 'UNLINK');

-- CreateEnum
CREATE TYPE "UserProfileNotificationChannel" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP', 'NONE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "passwordHash" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "roles" "Role"[] DEFAULT ARRAY['EMPLOYEE']::"Role"[],
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfilePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredName" TEXT,
    "phoneNumber" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "primaryBase" TEXT,
    "notificationChannel" "UserProfileNotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfilePreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entryKind" "ApplicationEntryKind" NOT NULL DEFAULT 'NATIVE',
    "entryPath" TEXT NOT NULL,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserApplicationAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "UserApplicationAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserApplicationAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserApplicationRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "roleCode" "ApplicationRoleCode" NOT NULL,
    "status" "UserApplicationRoleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserApplicationRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "entityLabel" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTeam" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SupportTeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "notificationProvider" "SupportIntegrationProvider",
    "notificationRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportDepartment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "SupportCatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormRequest" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "respondentUserId" TEXT NOT NULL,
    "sourceApplication" TEXT NOT NULL,
    "sourceContextType" TEXT NOT NULL,
    "sourceContextId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "status" "FormRequestStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormResponse" (
    "id" TEXT NOT NULL,
    "formRequestId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTopic" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "SupportCatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "defaultPriority" "SupportCasePriority" NOT NULL DEFAULT 'NORMAL',
    "openingPolicy" "SupportCaseOpeningPolicy" NOT NULL DEFAULT 'CONTINUOUS_CONVERSATION',
    "businessKeyFieldCode" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportRoutingRule" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "topicId" TEXT,
    "teamId" TEXT NOT NULL,
    "status" "SupportCatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "conditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportRoutingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatParticipantRole" NOT NULL DEFAULT 'AGENT',
    "status" "SupportCatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTopicForm" (
    "id" TEXT NOT NULL,
    "topicId" TEXT,
    "ownerType" "FormOwnerType" NOT NULL DEFAULT 'SUPPORT_DEPARTMENT',
    "ownerDepartmentId" TEXT,
    "key" TEXT,
    "version" INTEGER NOT NULL,
    "status" "SupportCatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "schema" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTopicForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTopicField" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "SupportFormFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "helpText" TEXT,
    "options" JSONB,
    "optionSourceKey" TEXT,
    "visibleWhen" JSONB,
    "requiredWhen" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTopicField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionSource" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adapterType" "OptionSourceAdapterType" NOT NULL,
    "status" "OptionSourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "config" JSONB NOT NULL,
    "cacheTtlSeconds" INTEGER NOT NULL DEFAULT 300,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTopicFormBinding" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "status" "SupportCatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTopicFormBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "cpf" TEXT,
    "birthDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "externalEmployeeId" TEXT,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSsoTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSsoTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdministrativeInvitation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "reason" "AccessChangeReason" NOT NULL,
    "reasonComment" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdministrativeInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "eventType" "AuthAuditEventType" NOT NULL,
    "outcome" "AuthAuditOutcome" NOT NULL,
    "requestId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrakeWebhookInboxEvent" (
    "id" TEXT NOT NULL,
    "webhookType" TEXT NOT NULL,
    "requestId" TEXT,
    "correlationId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "eventName" TEXT,
    "externalEventId" TEXT,
    "employeeId" TEXT,
    "status" "IntegrationInboxStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "storagePath" TEXT,
    "processingAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastQueuedAt" TIMESTAMP(3),
    "processingStartedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrakeWebhookInboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "employeeUserId" TEXT,
    "sector" "ChatSector",
    "primaryTeamId" TEXT,
    "kind" "ChatConversationKind" NOT NULL DEFAULT 'SUPPORT',
    "title" TEXT NOT NULL,
    "status" "ChatConversationStatus" NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "participantType" "ChatParticipantType" NOT NULL,
    "participantKey" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "sector" "ChatSector",
    "externalRef" TEXT,
    "role" "ChatParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "mutedAt" TIMESTAMP(3),

    CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" "ChatMessageSenderType" NOT NULL,
    "senderUserId" TEXT,
    "senderTeamId" TEXT,
    "senderSector" "ChatSector",
    "senderName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "clientMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportCase" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "departmentId" TEXT,
    "topicId" TEXT,
    "topicFormId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "businessKey" TEXT,
    "status" "SupportCaseStatus" NOT NULL DEFAULT 'NEW',
    "priority" "SupportCasePriority" NOT NULL DEFAULT 'NORMAL',
    "origin" "SupportCaseOrigin" NOT NULL DEFAULT 'CHAT',
    "requesterUserId" TEXT NOT NULL,
    "currentSector" "ChatSector",
    "currentTeamId" TEXT,
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

-- CreateTable
CREATE TABLE "SupportSlaPolicy" (
    "id" TEXT NOT NULL,
    "priority" "SupportCasePriority" NOT NULL,
    "resolutionTargetMinutes" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportSlaPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "SupportCaseFieldValue" (
    "id" TEXT NOT NULL,
    "supportCaseId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportCaseFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTriageSuggestion" (
    "id" TEXT NOT NULL,
    "supportCaseId" TEXT,
    "requesterUserId" TEXT,
    "source" "SupportTriageSuggestionSource" NOT NULL,
    "inputHash" TEXT NOT NULL,
    "suggestedDepartmentId" TEXT,
    "suggestedTopicId" TEXT,
    "suggestedTeamId" TEXT,
    "confidence" DOUBLE PRECISION,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTriageSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportIntegrationLink" (
    "id" TEXT NOT NULL,
    "provider" "SupportIntegrationProvider" NOT NULL,
    "conversationId" TEXT,
    "supportCaseId" TEXT,
    "externalTenantId" TEXT,
    "externalWorkspaceId" TEXT,
    "externalChannelId" TEXT,
    "externalReference" TEXT,
    "externalUrl" TEXT,
    "purpose" TEXT NOT NULL DEFAULT 'NOTIFICATION',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportIntegrationLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "DomainEventOutbox" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "correlationId" TEXT,
    "status" "DomainEventOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainEventOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedDomainEvent" (
    "id" TEXT NOT NULL,
    "consumer" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedDomainEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatReadState" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadMessageId" TEXT,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatReadState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_personId_key" ON "User"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfilePreference_userId_key" ON "UserProfilePreference"("userId");

-- CreateIndex
CREATE INDEX "UserProfilePreference_notificationChannel_idx" ON "UserProfilePreference"("notificationChannel");

-- CreateIndex
CREATE UNIQUE INDEX "Application_code_key" ON "Application"("code");

-- CreateIndex
CREATE INDEX "Application_status_sortOrder_name_idx" ON "Application"("status", "sortOrder", "name");

-- CreateIndex
CREATE INDEX "UserApplicationAccess_userId_status_idx" ON "UserApplicationAccess"("userId", "status");

-- CreateIndex
CREATE INDEX "UserApplicationAccess_applicationId_status_idx" ON "UserApplicationAccess"("applicationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserApplicationAccess_userId_applicationId_key" ON "UserApplicationAccess"("userId", "applicationId");

-- CreateIndex
CREATE INDEX "UserApplicationRole_userId_applicationId_status_idx" ON "UserApplicationRole"("userId", "applicationId", "status");

-- CreateIndex
CREATE INDEX "UserApplicationRole_applicationId_roleCode_status_idx" ON "UserApplicationRole"("applicationId", "roleCode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserApplicationRole_userId_applicationId_roleCode_key" ON "UserApplicationRole"("userId", "applicationId", "roleCode");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTeam_code_key" ON "SupportTeam"("code");

-- CreateIndex
CREATE INDEX "SupportTeam_departmentId_status_name_idx" ON "SupportTeam"("departmentId", "status", "name");

-- CreateIndex
CREATE INDEX "SupportTeam_status_name_idx" ON "SupportTeam"("status", "name");

-- CreateIndex
CREATE INDEX "SupportTeam_notificationProvider_notificationRef_idx" ON "SupportTeam"("notificationProvider", "notificationRef");

-- CreateIndex
CREATE UNIQUE INDEX "SupportDepartment_code_key" ON "SupportDepartment"("code");

-- CreateIndex
CREATE INDEX "SupportDepartment_status_sortOrder_name_idx" ON "SupportDepartment"("status", "sortOrder", "name");

-- CreateIndex
CREATE INDEX "FormRequest_respondentUserId_status_dueAt_idx" ON "FormRequest"("respondentUserId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "FormRequest_sourceApplication_sourceContextType_sourceConte_idx" ON "FormRequest"("sourceApplication", "sourceContextType", "sourceContextId");

-- CreateIndex
CREATE INDEX "FormRequest_formId_status_idx" ON "FormRequest"("formId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FormResponse_formRequestId_key" ON "FormResponse"("formRequestId");

-- CreateIndex
CREATE INDEX "SupportTopic_departmentId_status_sortOrder_name_idx" ON "SupportTopic"("departmentId", "status", "sortOrder", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTopic_departmentId_code_key" ON "SupportTopic"("departmentId", "code");

-- CreateIndex
CREATE INDEX "SupportRoutingRule_departmentId_topicId_status_priority_idx" ON "SupportRoutingRule"("departmentId", "topicId", "status", "priority");

-- CreateIndex
CREATE INDEX "SupportRoutingRule_teamId_status_idx" ON "SupportRoutingRule"("teamId", "status");

-- CreateIndex
CREATE INDEX "SupportTeamMember_userId_status_idx" ON "SupportTeamMember"("userId", "status");

-- CreateIndex
CREATE INDEX "SupportTeamMember_teamId_status_idx" ON "SupportTeamMember"("teamId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTeamMember_teamId_userId_key" ON "SupportTeamMember"("teamId", "userId");

-- CreateIndex
CREATE INDEX "SupportTopicForm_ownerType_ownerDepartmentId_status_idx" ON "SupportTopicForm"("ownerType", "ownerDepartmentId", "status");

-- CreateIndex
CREATE INDEX "SupportTopicForm_topicId_status_version_idx" ON "SupportTopicForm"("topicId", "status", "version");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTopicForm_topicId_version_key" ON "SupportTopicForm"("topicId", "version");

-- CreateIndex
CREATE INDEX "SupportTopicField_formId_sortOrder_idx" ON "SupportTopicField"("formId", "sortOrder");

-- CreateIndex
CREATE INDEX "SupportTopicField_optionSourceKey_idx" ON "SupportTopicField"("optionSourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTopicField_formId_code_key" ON "SupportTopicField"("formId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "OptionSource_key_key" ON "OptionSource"("key");

-- CreateIndex
CREATE INDEX "OptionSource_status_name_idx" ON "OptionSource"("status", "name");

-- CreateIndex
CREATE INDEX "OptionSource_adapterType_status_idx" ON "OptionSource"("adapterType", "status");

-- CreateIndex
CREATE INDEX "SupportTopicFormBinding_topicId_status_sortOrder_idx" ON "SupportTopicFormBinding"("topicId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "SupportTopicFormBinding_formId_status_idx" ON "SupportTopicFormBinding"("formId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTopicFormBinding_topicId_formId_key" ON "SupportTopicFormBinding"("topicId", "formId");

-- CreateIndex
CREATE UNIQUE INDEX "Person_cpf_key" ON "Person"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_personId_key" ON "Employee"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeNumber_key" ON "Employee"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_externalEmployeeId_key" ON "Employee"("externalEmployeeId");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSsoTicket_tokenHash_key" ON "AuthSsoTicket"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSsoTicket_userId_expiresAt_idx" ON "AuthSsoTicket"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "AuthSsoTicket_expiresAt_idx" ON "AuthSsoTicket"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdministrativeInvitation_tokenHash_key" ON "AdministrativeInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "AdministrativeInvitation_userId_expiresAt_idx" ON "AdministrativeInvitation"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "AdministrativeInvitation_createdByUserId_createdAt_idx" ON "AdministrativeInvitation"("createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdministrativeInvitation_expiresAt_idx" ON "AdministrativeInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthAuditLog_userId_idx" ON "AuthAuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuthAuditLog_eventType_createdAt_idx" ON "AuthAuditLog"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAuditLog_requestId_idx" ON "AuthAuditLog"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "DrakeWebhookInboxEvent_idempotencyKey_key" ON "DrakeWebhookInboxEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "DrakeWebhookInboxEvent_webhookType_createdAt_idx" ON "DrakeWebhookInboxEvent"("webhookType", "createdAt");

-- CreateIndex
CREATE INDEX "DrakeWebhookInboxEvent_correlationId_idx" ON "DrakeWebhookInboxEvent"("correlationId");

-- CreateIndex
CREATE INDEX "DrakeWebhookInboxEvent_externalEventId_idx" ON "DrakeWebhookInboxEvent"("externalEventId");

-- CreateIndex
CREATE INDEX "DrakeWebhookInboxEvent_employeeId_idx" ON "DrakeWebhookInboxEvent"("employeeId");

-- CreateIndex
CREATE INDEX "DrakeWebhookInboxEvent_status_createdAt_idx" ON "DrakeWebhookInboxEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ChatConversation_kind_status_updatedAt_idx" ON "ChatConversation"("kind", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "ChatConversation_primaryTeamId_status_updatedAt_idx" ON "ChatConversation"("primaryTeamId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "ChatConversation_employeeUserId_status_updatedAt_idx" ON "ChatConversation"("employeeUserId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "ChatConversation_employeeUserId_sector_kind_status_idx" ON "ChatConversation"("employeeUserId", "sector", "kind", "status");

-- CreateIndex
CREATE INDEX "ChatConversation_sector_updatedAt_idx" ON "ChatConversation"("sector", "updatedAt");

-- CreateIndex
CREATE INDEX "ChatParticipant_userId_leftAt_idx" ON "ChatParticipant"("userId", "leftAt");

-- CreateIndex
CREATE INDEX "ChatParticipant_teamId_leftAt_idx" ON "ChatParticipant"("teamId", "leftAt");

-- CreateIndex
CREATE INDEX "ChatParticipant_sector_leftAt_idx" ON "ChatParticipant"("sector", "leftAt");

-- CreateIndex
CREATE INDEX "ChatParticipant_participantType_participantKey_idx" ON "ChatParticipant"("participantType", "participantKey");

-- CreateIndex
CREATE UNIQUE INDEX "ChatParticipant_conversationId_participantKey_key" ON "ChatParticipant"("conversationId", "participantKey");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_senderUserId_createdAt_idx" ON "ChatMessage"("senderUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_conversationId_clientMessageId_key" ON "ChatMessage"("conversationId", "clientMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportCase_code_key" ON "SupportCase"("code");

-- CreateIndex
CREATE INDEX "SupportCase_departmentId_status_updatedAt_idx" ON "SupportCase"("departmentId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportCase_topicId_status_updatedAt_idx" ON "SupportCase"("topicId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportCase_requesterUserId_status_updatedAt_idx" ON "SupportCase"("requesterUserId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportCase_requesterUserId_topicId_businessKey_status_idx" ON "SupportCase"("requesterUserId", "topicId", "businessKey", "status");

-- CreateIndex
CREATE INDEX "SupportCase_currentTeamId_status_updatedAt_idx" ON "SupportCase"("currentTeamId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportCase_currentSector_status_updatedAt_idx" ON "SupportCase"("currentSector", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportCase_assignedUserId_status_updatedAt_idx" ON "SupportCase"("assignedUserId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportCase_originConversationId_idx" ON "SupportCase"("originConversationId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportSlaPolicy_priority_key" ON "SupportSlaPolicy"("priority");

-- CreateIndex
CREATE INDEX "SupportSlaPolicy_active_priority_idx" ON "SupportSlaPolicy"("active", "priority");

-- CreateIndex
CREATE INDEX "ApprovalRule_departmentId_topicId_status_priority_idx" ON "ApprovalRule"("departmentId", "topicId", "status", "priority");

-- CreateIndex
CREATE INDEX "ApprovalRule_formId_status_priority_idx" ON "ApprovalRule"("formId", "status", "priority");

-- CreateIndex
CREATE INDEX "ApprovalRule_approvalTeamId_status_idx" ON "ApprovalRule"("approvalTeamId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_currentStepId_key" ON "ApprovalRequest"("currentStepId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_supportCaseId_status_updatedAt_idx" ON "ApprovalRequest"("supportCaseId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_dueAt_idx" ON "ApprovalRequest"("status", "dueAt");

-- CreateIndex
CREATE INDEX "ApprovalRequest_ruleId_status_idx" ON "ApprovalRequest"("ruleId", "status");

-- CreateIndex
CREATE INDEX "ApprovalStep_approvalTeamId_status_dueAt_idx" ON "ApprovalStep"("approvalTeamId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "ApprovalStep_approvalRequestId_stepOrder_idx" ON "ApprovalStep"("approvalRequestId", "stepOrder");

-- CreateIndex
CREATE INDEX "ApprovalStep_decidedByUserId_decidedAt_idx" ON "ApprovalStep"("decidedByUserId", "decidedAt");

-- CreateIndex
CREATE INDEX "ApprovalEvent_approvalRequestId_createdAt_idx" ON "ApprovalEvent"("approvalRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalEvent_approvalStepId_createdAt_idx" ON "ApprovalEvent"("approvalStepId", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalEvent_eventType_createdAt_idx" ON "ApprovalEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "SupportResponsibilityPeriod_supportCaseId_startedAt_idx" ON "SupportResponsibilityPeriod"("supportCaseId", "startedAt");

-- CreateIndex
CREATE INDEX "SupportResponsibilityPeriod_ownerTeamId_ownerType_endedAt_idx" ON "SupportResponsibilityPeriod"("ownerTeamId", "ownerType", "endedAt");

-- CreateIndex
CREATE INDEX "SupportResponsibilityPeriod_approvalRequestId_idx" ON "SupportResponsibilityPeriod"("approvalRequestId");

-- CreateIndex
CREATE INDEX "SupportCaseFieldValue_fieldId_idx" ON "SupportCaseFieldValue"("fieldId");

-- CreateIndex
CREATE INDEX "SupportCaseFieldValue_supportCaseId_idx" ON "SupportCaseFieldValue"("supportCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportCaseFieldValue_supportCaseId_fieldId_key" ON "SupportCaseFieldValue"("supportCaseId", "fieldId");

-- CreateIndex
CREATE INDEX "SupportTriageSuggestion_requesterUserId_createdAt_idx" ON "SupportTriageSuggestion"("requesterUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTriageSuggestion_source_createdAt_idx" ON "SupportTriageSuggestion"("source", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTriageSuggestion_suggestedDepartmentId_idx" ON "SupportTriageSuggestion"("suggestedDepartmentId");

-- CreateIndex
CREATE INDEX "SupportTriageSuggestion_suggestedTopicId_idx" ON "SupportTriageSuggestion"("suggestedTopicId");

-- CreateIndex
CREATE INDEX "SupportTriageSuggestion_suggestedTeamId_idx" ON "SupportTriageSuggestion"("suggestedTeamId");

-- CreateIndex
CREATE INDEX "SupportIntegrationLink_conversationId_idx" ON "SupportIntegrationLink"("conversationId");

-- CreateIndex
CREATE INDEX "SupportIntegrationLink_supportCaseId_idx" ON "SupportIntegrationLink"("supportCaseId");

-- CreateIndex
CREATE INDEX "SupportIntegrationLink_provider_purpose_idx" ON "SupportIntegrationLink"("provider", "purpose");

-- CreateIndex
CREATE INDEX "SupportIntegrationLink_provider_externalWorkspaceId_externa_idx" ON "SupportIntegrationLink"("provider", "externalWorkspaceId", "externalChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportIntegrationLink_provider_externalReference_key" ON "SupportIntegrationLink"("provider", "externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "SupportRating_supportCaseId_key" ON "SupportRating"("supportCaseId");

-- CreateIndex
CREATE INDEX "SupportRating_reviewerUserId_createdAt_idx" ON "SupportRating"("reviewerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportRating_score_createdAt_idx" ON "SupportRating"("score", "createdAt");

-- CreateIndex
CREATE INDEX "SupportCaseEvent_supportCaseId_createdAt_idx" ON "SupportCaseEvent"("supportCaseId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportCaseEvent_authorUserId_createdAt_idx" ON "SupportCaseEvent"("authorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportCaseEvent_eventType_createdAt_idx" ON "SupportCaseEvent"("eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DomainEventOutbox_idempotencyKey_key" ON "DomainEventOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "DomainEventOutbox_status_availableAt_idx" ON "DomainEventOutbox"("status", "availableAt");

-- CreateIndex
CREATE INDEX "DomainEventOutbox_aggregateType_aggregateId_createdAt_idx" ON "DomainEventOutbox"("aggregateType", "aggregateId", "createdAt");

-- CreateIndex
CREATE INDEX "DomainEventOutbox_eventType_createdAt_idx" ON "DomainEventOutbox"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "DomainEventOutbox_correlationId_idx" ON "DomainEventOutbox"("correlationId");

-- CreateIndex
CREATE INDEX "ProcessedDomainEvent_eventId_idx" ON "ProcessedDomainEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedDomainEvent_consumer_eventId_key" ON "ProcessedDomainEvent"("consumer", "eventId");

-- CreateIndex
CREATE INDEX "ChatReadState_userId_lastReadAt_idx" ON "ChatReadState"("userId", "lastReadAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatReadState_conversationId_userId_key" ON "ChatReadState"("conversationId", "userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfilePreference" ADD CONSTRAINT "UserProfilePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserApplicationAccess" ADD CONSTRAINT "UserApplicationAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserApplicationAccess" ADD CONSTRAINT "UserApplicationAccess_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserApplicationRole" ADD CONSTRAINT "UserApplicationRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserApplicationRole" ADD CONSTRAINT "UserApplicationRole_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTeam" ADD CONSTRAINT "SupportTeam_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "SupportDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormRequest" ADD CONSTRAINT "FormRequest_formId_fkey" FOREIGN KEY ("formId") REFERENCES "SupportTopicForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormRequest" ADD CONSTRAINT "FormRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormRequest" ADD CONSTRAINT "FormRequest_respondentUserId_fkey" FOREIGN KEY ("respondentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_formRequestId_fkey" FOREIGN KEY ("formRequestId") REFERENCES "FormRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTopic" ADD CONSTRAINT "SupportTopic_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "SupportDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRoutingRule" ADD CONSTRAINT "SupportRoutingRule_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "SupportDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRoutingRule" ADD CONSTRAINT "SupportRoutingRule_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SupportTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRoutingRule" ADD CONSTRAINT "SupportRoutingRule_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SupportTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTeamMember" ADD CONSTRAINT "SupportTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SupportTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTeamMember" ADD CONSTRAINT "SupportTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTopicForm" ADD CONSTRAINT "SupportTopicForm_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SupportTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTopicForm" ADD CONSTRAINT "SupportTopicForm_ownerDepartmentId_fkey" FOREIGN KEY ("ownerDepartmentId") REFERENCES "SupportDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTopicField" ADD CONSTRAINT "SupportTopicField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "SupportTopicForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTopicField" ADD CONSTRAINT "SupportTopicField_optionSourceKey_fkey" FOREIGN KEY ("optionSourceKey") REFERENCES "OptionSource"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTopicFormBinding" ADD CONSTRAINT "SupportTopicFormBinding_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SupportTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTopicFormBinding" ADD CONSTRAINT "SupportTopicFormBinding_formId_fkey" FOREIGN KEY ("formId") REFERENCES "SupportTopicForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSsoTicket" ADD CONSTRAINT "AuthSsoTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSsoTicket" ADD CONSTRAINT "AuthSsoTicket_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeInvitation" ADD CONSTRAINT "AdministrativeInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeInvitation" ADD CONSTRAINT "AdministrativeInvitation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAuditLog" ADD CONSTRAINT "AuthAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_employeeUserId_fkey" FOREIGN KEY ("employeeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_primaryTeamId_fkey" FOREIGN KEY ("primaryTeamId") REFERENCES "SupportTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SupportTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderTeamId_fkey" FOREIGN KEY ("senderTeamId") REFERENCES "SupportTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "SupportDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SupportTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_topicFormId_fkey" FOREIGN KEY ("topicFormId") REFERENCES "SupportTopicForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_currentTeamId_fkey" FOREIGN KEY ("currentTeamId") REFERENCES "SupportTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_originConversationId_fkey" FOREIGN KEY ("originConversationId") REFERENCES "ChatConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_originMessageId_fkey" FOREIGN KEY ("originMessageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRule" ADD CONSTRAINT "ApprovalRule_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "SupportDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRule" ADD CONSTRAINT "ApprovalRule_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SupportTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRule" ADD CONSTRAINT "ApprovalRule_formId_fkey" FOREIGN KEY ("formId") REFERENCES "SupportTopicForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRule" ADD CONSTRAINT "ApprovalRule_approvalTeamId_fkey" FOREIGN KEY ("approvalTeamId") REFERENCES "SupportTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_supportCaseId_fkey" FOREIGN KEY ("supportCaseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ApprovalRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_currentStepId_fkey" FOREIGN KEY ("currentStepId") REFERENCES "ApprovalStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approvalTeamId_fkey" FOREIGN KEY ("approvalTeamId") REFERENCES "SupportTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalEvent" ADD CONSTRAINT "ApprovalEvent_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalEvent" ADD CONSTRAINT "ApprovalEvent_approvalStepId_fkey" FOREIGN KEY ("approvalStepId") REFERENCES "ApprovalStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalEvent" ADD CONSTRAINT "ApprovalEvent_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportResponsibilityPeriod" ADD CONSTRAINT "SupportResponsibilityPeriod_supportCaseId_fkey" FOREIGN KEY ("supportCaseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportResponsibilityPeriod" ADD CONSTRAINT "SupportResponsibilityPeriod_ownerTeamId_fkey" FOREIGN KEY ("ownerTeamId") REFERENCES "SupportTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportResponsibilityPeriod" ADD CONSTRAINT "SupportResponsibilityPeriod_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCaseFieldValue" ADD CONSTRAINT "SupportCaseFieldValue_supportCaseId_fkey" FOREIGN KEY ("supportCaseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCaseFieldValue" ADD CONSTRAINT "SupportCaseFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "SupportTopicField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTriageSuggestion" ADD CONSTRAINT "SupportTriageSuggestion_supportCaseId_fkey" FOREIGN KEY ("supportCaseId") REFERENCES "SupportCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportIntegrationLink" ADD CONSTRAINT "SupportIntegrationLink_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportIntegrationLink" ADD CONSTRAINT "SupportIntegrationLink_supportCaseId_fkey" FOREIGN KEY ("supportCaseId") REFERENCES "SupportCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRating" ADD CONSTRAINT "SupportRating_supportCaseId_fkey" FOREIGN KEY ("supportCaseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRating" ADD CONSTRAINT "SupportRating_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCaseEvent" ADD CONSTRAINT "SupportCaseEvent_supportCaseId_fkey" FOREIGN KEY ("supportCaseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCaseEvent" ADD CONSTRAINT "SupportCaseEvent_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReadState" ADD CONSTRAINT "ChatReadState_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReadState" ADD CONSTRAINT "ChatReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

