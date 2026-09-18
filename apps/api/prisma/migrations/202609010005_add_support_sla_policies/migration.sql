CREATE TABLE "SupportSlaPolicy" (
  "id" TEXT NOT NULL,
  "priority" "SupportCasePriority" NOT NULL,
  "resolutionTargetMinutes" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportSlaPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportSlaPolicy_priority_key" ON "SupportSlaPolicy"("priority");
CREATE INDEX "SupportSlaPolicy_active_priority_idx" ON "SupportSlaPolicy"("active", "priority");
