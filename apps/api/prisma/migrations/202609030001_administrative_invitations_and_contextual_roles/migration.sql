ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "ApplicationRoleCode" ADD VALUE IF NOT EXISTS 'MEMBER';
ALTER TYPE "ApplicationRoleCode" ADD VALUE IF NOT EXISTS 'REQUESTER';
ALTER TYPE "ApplicationRoleCode" ADD VALUE IF NOT EXISTS 'VIEWER';
ALTER TYPE "ApplicationRoleCode" ADD VALUE IF NOT EXISTS 'AUTHOR';
ALTER TYPE "ApplicationRoleCode" ADD VALUE IF NOT EXISTS 'PUBLISHER';

CREATE TYPE "AccessChangeReason" AS ENUM (
  'ONBOARDING',
  'ROLE_CHANGE',
  'SECURITY',
  'OFFBOARDING',
  'ACCESS_CORRECTION',
  'OTHER'
);

ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

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

CREATE UNIQUE INDEX "AdministrativeInvitation_tokenHash_key" ON "AdministrativeInvitation"("tokenHash");
CREATE INDEX "AdministrativeInvitation_userId_expiresAt_idx" ON "AdministrativeInvitation"("userId", "expiresAt");
CREATE INDEX "AdministrativeInvitation_createdByUserId_createdAt_idx" ON "AdministrativeInvitation"("createdByUserId", "createdAt");
CREATE INDEX "AdministrativeInvitation_expiresAt_idx" ON "AdministrativeInvitation"("expiresAt");

ALTER TABLE "AdministrativeInvitation"
  ADD CONSTRAINT "AdministrativeInvitation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdministrativeInvitation"
  ADD CONSTRAINT "AdministrativeInvitation_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
