INSERT INTO "SupportTeam" ("id", "code", "name", "status", "createdAt", "updatedAt")
VALUES
  ('team_ti', 'TI', 'Tecnologia', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('team_support', 'SUPPORT', 'Suporte interno', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "updatedAt" = CURRENT_TIMESTAMP;
