CREATE TABLE "ProcessedDomainEvent" (
  "id" TEXT NOT NULL,
  "consumer" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessedDomainEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProcessedDomainEvent_consumer_eventId_key"
  ON "ProcessedDomainEvent"("consumer", "eventId");
CREATE INDEX "ProcessedDomainEvent_eventId_idx"
  ON "ProcessedDomainEvent"("eventId");
