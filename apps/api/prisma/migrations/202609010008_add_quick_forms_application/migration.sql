INSERT INTO "Application" (
  "id",
  "code",
  "name",
  "description",
  "entryPath",
  "sortOrder",
  "status",
  "createdAt",
  "updatedAt"
)
VALUES (
  'quick_forms_catalog',
  'QUICK_FORMS',
  'QuickForms',
  'Criacao, versionamento e solicitacoes de formularios.',
  '/formularios',
  30,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "entryPath" = EXCLUDED."entryPath",
  "sortOrder" = EXCLUDED."sortOrder",
  "status" = 'ACTIVE',
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "UserApplicationAccess" (
  "id",
  "userId",
  "applicationId",
  "status",
  "isDefault",
  "createdAt",
  "updatedAt"
)
SELECT
  'quickforms-access-' || md5(user_row."id"),
  user_row."id",
  application."id",
  'ACTIVE',
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" AS user_row
CROSS JOIN "Application" AS application
WHERE application."code" = 'QUICK_FORMS'
  AND user_row."status" = 'ACTIVE'
  AND user_row."roles" && ARRAY['ADMIN', 'TI']::"Role"[]
ON CONFLICT ("userId", "applicationId") DO UPDATE
SET
  "status" = 'ACTIVE',
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "UserApplicationRole" (
  "id",
  "userId",
  "applicationId",
  "roleCode",
  "status",
  "createdAt",
  "updatedAt"
)
SELECT
  'quickforms-role-' || md5(user_row."id"),
  user_row."id",
  application."id",
  'ADMIN',
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" AS user_row
CROSS JOIN "Application" AS application
WHERE application."code" = 'QUICK_FORMS'
  AND user_row."status" = 'ACTIVE'
  AND user_row."roles" && ARRAY['ADMIN', 'TI']::"Role"[]
ON CONFLICT ("userId", "applicationId", "roleCode") DO UPDATE
SET
  "status" = 'ACTIVE',
  "updatedAt" = CURRENT_TIMESTAMP;
