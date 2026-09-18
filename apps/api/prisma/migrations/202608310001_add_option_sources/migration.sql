CREATE TYPE "OptionSourceAdapterType" AS ENUM ('STATIC', 'HTTP_JSON');

CREATE TYPE "OptionSourceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

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

CREATE UNIQUE INDEX "OptionSource_key_key" ON "OptionSource"("key");
CREATE INDEX "OptionSource_status_name_idx" ON "OptionSource"("status", "name");
CREATE INDEX "OptionSource_adapterType_status_idx" ON "OptionSource"("adapterType", "status");
