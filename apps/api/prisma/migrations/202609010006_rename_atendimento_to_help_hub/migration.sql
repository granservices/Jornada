DO $$
DECLARE
  legacy_application_id TEXT;
  help_hub_application_id TEXT;
BEGIN
  SELECT "id" INTO legacy_application_id
  FROM "Application"
  WHERE "code" = 'ATENDIMENTO';

  SELECT "id" INTO help_hub_application_id
  FROM "Application"
  WHERE "code" = 'HELP_HUB';

  IF legacy_application_id IS NULL THEN
    RETURN;
  END IF;

  IF help_hub_application_id IS NULL THEN
    UPDATE "Application"
    SET
      "code" = 'HELP_HUB',
      "name" = 'HelpHub',
      "description" = 'Workspace operacional de chamados e filas.',
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = legacy_application_id;
    RETURN;
  END IF;

  UPDATE "UserApplicationAccess" AS target
  SET
    "status" = CASE
      WHEN legacy."status" = 'ACTIVE' THEN 'ACTIVE'::"UserApplicationAccessStatus"
      ELSE target."status"
    END,
    "isDefault" = target."isDefault" OR legacy."isDefault",
    "updatedAt" = CURRENT_TIMESTAMP
  FROM "UserApplicationAccess" AS legacy
  WHERE target."applicationId" = help_hub_application_id
    AND legacy."applicationId" = legacy_application_id
    AND target."userId" = legacy."userId";

  DELETE FROM "UserApplicationAccess" AS legacy
  USING "UserApplicationAccess" AS target
  WHERE legacy."applicationId" = legacy_application_id
    AND target."applicationId" = help_hub_application_id
    AND target."userId" = legacy."userId";

  UPDATE "UserApplicationAccess"
  SET "applicationId" = help_hub_application_id, "updatedAt" = CURRENT_TIMESTAMP
  WHERE "applicationId" = legacy_application_id;

  UPDATE "UserApplicationRole" AS target
  SET
    "status" = CASE
      WHEN legacy."status" = 'ACTIVE' THEN 'ACTIVE'::"UserApplicationRoleStatus"
      ELSE target."status"
    END,
    "updatedAt" = CURRENT_TIMESTAMP
  FROM "UserApplicationRole" AS legacy
  WHERE target."applicationId" = help_hub_application_id
    AND legacy."applicationId" = legacy_application_id
    AND target."userId" = legacy."userId"
    AND target."roleCode" = legacy."roleCode";

  DELETE FROM "UserApplicationRole" AS legacy
  USING "UserApplicationRole" AS target
  WHERE legacy."applicationId" = legacy_application_id
    AND target."applicationId" = help_hub_application_id
    AND target."userId" = legacy."userId"
    AND target."roleCode" = legacy."roleCode";

  UPDATE "UserApplicationRole"
  SET "applicationId" = help_hub_application_id, "updatedAt" = CURRENT_TIMESTAMP
  WHERE "applicationId" = legacy_application_id;

  UPDATE "Application"
  SET
    "name" = 'HelpHub',
    "description" = 'Workspace operacional de chamados e filas.',
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE "id" = help_hub_application_id;

  DELETE FROM "Application" WHERE "id" = legacy_application_id;
END $$;
