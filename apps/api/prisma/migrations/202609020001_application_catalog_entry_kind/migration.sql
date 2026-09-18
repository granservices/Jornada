CREATE TYPE "ApplicationEntryKind" AS ENUM ('NATIVE', 'REDIRECT');

ALTER TABLE "Application"
ADD COLUMN "entryKind" "ApplicationEntryKind" NOT NULL DEFAULT 'NATIVE',
ADD COLUMN "imageUrl" TEXT;

UPDATE "Application"
SET
  "entryKind" = CASE
    WHEN "code" IN ('HELP_HUB', 'QUICK_FORMS') THEN 'REDIRECT'::"ApplicationEntryKind"
    ELSE 'NATIVE'::"ApplicationEntryKind"
  END,
  "description" = CASE "code"
    WHEN 'JORNADA' THEN 'Acompanhe a programacao de embarque e os vencimentos de ASO e treinamentos.'
    WHEN 'HELP_HUB' THEN 'Atendimentos e suporte ao colaborador.'
    WHEN 'QUICK_FORMS' THEN 'Criacao, versionamento e solicitacoes de formularios.'
    ELSE "description"
  END
WHERE "code" IN ('JORNADA', 'HELP_HUB', 'QUICK_FORMS');
