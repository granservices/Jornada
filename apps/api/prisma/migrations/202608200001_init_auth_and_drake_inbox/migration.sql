-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'DISABLED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'ADMIN', 'SUPPORT', 'TI', 'MEDICINE', 'OPERATIONS');

-- CreateEnum
CREATE TYPE "AuthAuditEventType" AS ENUM ('REGISTER', 'LOGIN', 'REFRESH', 'LOGOUT', 'FORGOT_PASSWORD', 'RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "AuthAuditOutcome" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateEnum
CREATE TYPE "IntegrationInboxStatus" AS ENUM ('RECEIVED', 'DUPLICATE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "roles" "Role"[] DEFAULT ARRAY['EMPLOYEE']::"Role"[],
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrakeWebhookInboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

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

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAuditLog" ADD CONSTRAINT "AuthAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
