CREATE TYPE "FormOwnerType" AS ENUM ('GLOBAL', 'SUPPORT_DEPARTMENT');

ALTER TABLE "SupportTopicForm"
  ADD COLUMN "ownerType" "FormOwnerType" NOT NULL DEFAULT 'SUPPORT_DEPARTMENT',
  ADD COLUMN "ownerDepartmentId" TEXT,
  ADD COLUMN "key" TEXT;

ALTER TABLE "SupportTopicForm"
  ALTER COLUMN "topicId" DROP NOT NULL;

UPDATE "SupportTopicForm" AS form
SET "ownerDepartmentId" = topic."departmentId"
FROM "SupportTopic" AS topic
WHERE form."topicId" = topic."id"
  AND form."ownerDepartmentId" IS NULL;

CREATE TABLE "SupportTopicFormBinding" (
  "id" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "status" "SupportCatalogStatus" NOT NULL DEFAULT 'ACTIVE',
  "required" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTopicFormBinding_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SupportTopicFormBinding" (
  "id",
  "topicId",
  "formId",
  "status",
  "required",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  'binding_' || "id",
  "topicId",
  "id",
  "status",
  true,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "SupportTopicForm"
WHERE "topicId" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE INDEX "SupportTopicForm_ownerType_ownerDepartmentId_status_idx"
  ON "SupportTopicForm"("ownerType", "ownerDepartmentId", "status");

CREATE UNIQUE INDEX "SupportTopicFormBinding_topicId_formId_key"
  ON "SupportTopicFormBinding"("topicId", "formId");

CREATE INDEX "SupportTopicFormBinding_topicId_status_sortOrder_idx"
  ON "SupportTopicFormBinding"("topicId", "status", "sortOrder");

CREATE INDEX "SupportTopicFormBinding_formId_status_idx"
  ON "SupportTopicFormBinding"("formId", "status");

ALTER TABLE "SupportTopicForm"
  ADD CONSTRAINT "SupportTopicForm_ownerDepartmentId_fkey"
  FOREIGN KEY ("ownerDepartmentId") REFERENCES "SupportDepartment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportTopicForm"
  DROP CONSTRAINT "SupportTopicForm_topicId_fkey",
  ADD CONSTRAINT "SupportTopicForm_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "SupportTopic"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportTopicFormBinding"
  ADD CONSTRAINT "SupportTopicFormBinding_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "SupportTopic"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTopicFormBinding"
  ADD CONSTRAINT "SupportTopicFormBinding_formId_fkey"
  FOREIGN KEY ("formId") REFERENCES "SupportTopicForm"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
