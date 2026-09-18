DROP INDEX IF EXISTS "ChatConversation_employeeUserId_sector_key";

CREATE INDEX IF NOT EXISTS "ChatConversation_employeeUserId_sector_kind_status_idx"
ON "ChatConversation"("employeeUserId", "sector", "kind", "status");
