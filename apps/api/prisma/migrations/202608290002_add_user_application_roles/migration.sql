CREATE TYPE "ApplicationRoleCode" AS ENUM (
  'USER',
  'AGENT',
  'MANAGER',
  'ADMIN'
);

CREATE TYPE "UserApplicationRoleStatus" AS ENUM (
  'ACTIVE',
  'REVOKED'
);

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

CREATE UNIQUE INDEX "UserApplicationRole_userId_applicationId_roleCode_key"
  ON "UserApplicationRole"("userId", "applicationId", "roleCode");

CREATE INDEX "UserApplicationRole_userId_applicationId_status_idx"
  ON "UserApplicationRole"("userId", "applicationId", "status");

CREATE INDEX "UserApplicationRole_applicationId_roleCode_status_idx"
  ON "UserApplicationRole"("applicationId", "roleCode", "status");

ALTER TABLE "UserApplicationRole"
  ADD CONSTRAINT "UserApplicationRole_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserApplicationRole"
  ADD CONSTRAINT "UserApplicationRole_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
