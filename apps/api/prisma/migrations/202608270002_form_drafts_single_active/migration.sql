WITH ranked_active_forms AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "key"
      ORDER BY "version" DESC, "updatedAt" DESC, "createdAt" DESC
    ) AS row_number
  FROM "SupportTopicForm"
  WHERE "status" = 'ACTIVE'
    AND "key" IS NOT NULL
)
UPDATE "SupportTopicForm"
SET "status" = 'INACTIVE'
WHERE "id" IN (
  SELECT "id"
  FROM ranked_active_forms
  WHERE row_number > 1
);

WITH ranked_draft_forms AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "key"
      ORDER BY "version" DESC, "updatedAt" DESC, "createdAt" DESC
    ) AS row_number
  FROM "SupportTopicForm"
  WHERE "status" = 'DRAFT'
    AND "key" IS NOT NULL
)
UPDATE "SupportTopicForm"
SET "status" = 'INACTIVE'
WHERE "id" IN (
  SELECT "id"
  FROM ranked_draft_forms
  WHERE row_number > 1
);

CREATE UNIQUE INDEX "SupportTopicForm_one_active_per_key"
  ON "SupportTopicForm" ("key")
  WHERE "status" = 'ACTIVE' AND "key" IS NOT NULL;

CREATE UNIQUE INDEX "SupportTopicForm_one_draft_per_key"
  ON "SupportTopicForm" ("key")
  WHERE "status" = 'DRAFT' AND "key" IS NOT NULL;
