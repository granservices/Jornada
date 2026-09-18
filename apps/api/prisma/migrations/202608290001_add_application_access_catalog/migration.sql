CREATE TYPE "ApplicationStatus" AS ENUM (
  'ACTIVE',
  'INACTIVE'
);

CREATE TYPE "UserApplicationAccessStatus" AS ENUM (
  'ACTIVE',
  'REVOKED'
);

CREATE TABLE "Application" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "entryPath" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

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

CREATE UNIQUE INDEX "Application_code_key" ON "Application"("code");
CREATE INDEX "Application_status_sortOrder_name_idx" ON "Application"("status", "sortOrder", "name");

CREATE UNIQUE INDEX "UserApplicationAccess_userId_applicationId_key" ON "UserApplicationAccess"("userId", "applicationId");
CREATE INDEX "UserApplicationAccess_userId_status_idx" ON "UserApplicationAccess"("userId", "status");
CREATE INDEX "UserApplicationAccess_applicationId_status_idx" ON "UserApplicationAccess"("applicationId", "status");

ALTER TABLE "UserApplicationAccess"
  ADD CONSTRAINT "UserApplicationAccess_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserApplicationAccess"
  ADD CONSTRAINT "UserApplicationAccess_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
