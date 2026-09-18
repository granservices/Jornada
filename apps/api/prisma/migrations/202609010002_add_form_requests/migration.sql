CREATE TYPE "FormRequestStatus" AS ENUM (
  'PENDING',
  'SUBMITTED',
  'EXPIRED',
  'CANCELLED'
);

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

CREATE INDEX "FormRequest_respondentUserId_status_dueAt_idx"
  ON "FormRequest"("respondentUserId", "status", "dueAt");
CREATE INDEX "FormRequest_sourceApplication_sourceContextType_sourceContextId_idx"
  ON "FormRequest"("sourceApplication", "sourceContextType", "sourceContextId");
CREATE INDEX "FormRequest_formId_status_idx"
  ON "FormRequest"("formId", "status");

ALTER TABLE "FormRequest"
  ADD CONSTRAINT "FormRequest_formId_fkey"
  FOREIGN KEY ("formId") REFERENCES "SupportTopicForm"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FormRequest"
  ADD CONSTRAINT "FormRequest_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FormRequest"
  ADD CONSTRAINT "FormRequest_respondentUserId_fkey"
  FOREIGN KEY ("respondentUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
