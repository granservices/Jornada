ALTER TABLE "SupportTopicFormBinding"
ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

WITH ranked_bindings AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "topicId"
      ORDER BY "sortOrder" ASC, "createdAt" ASC
    ) AS row_number
  FROM "SupportTopicFormBinding"
  WHERE "status" = 'ACTIVE'
)
UPDATE "SupportTopicFormBinding" AS binding
SET "isPrimary" = true
FROM ranked_bindings
WHERE binding."id" = ranked_bindings."id"
  AND ranked_bindings.row_number = 1;

CREATE UNIQUE INDEX "SupportTopicFormBinding_one_primary_per_topic_active"
ON "SupportTopicFormBinding" ("topicId")
WHERE "isPrimary" = true AND "status" = 'ACTIVE';
