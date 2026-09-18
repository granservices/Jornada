CREATE TYPE "DomainEventOutboxStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'DELIVERED',
  'FAILED'
);

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

CREATE UNIQUE INDEX "DomainEventOutbox_idempotencyKey_key"
  ON "DomainEventOutbox"("idempotencyKey");
CREATE INDEX "DomainEventOutbox_status_availableAt_idx"
  ON "DomainEventOutbox"("status", "availableAt");
CREATE INDEX "DomainEventOutbox_aggregateType_aggregateId_createdAt_idx"
  ON "DomainEventOutbox"("aggregateType", "aggregateId", "createdAt");
CREATE INDEX "DomainEventOutbox_eventType_createdAt_idx"
  ON "DomainEventOutbox"("eventType", "createdAt");
CREATE INDEX "DomainEventOutbox_correlationId_idx"
  ON "DomainEventOutbox"("correlationId");
