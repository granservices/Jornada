UPDATE "Application"
SET
  "name" = CASE "code"
    WHEN 'HELP_HUB' THEN 'Focall'
    ELSE "name"
  END,
  "entryKind" = 'NATIVE'::"ApplicationEntryKind",
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" IN ('HELP_HUB', 'QUICK_FORMS');
