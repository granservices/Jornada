CREATE TYPE "SupportCatalogStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "SupportFormFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'SELECT', 'DATE', 'BOOLEAN', 'NUMBER', 'FILE');
CREATE TYPE "SupportTriageSuggestionSource" AS ENUM ('RULE', 'LOCAL_AI', 'EXTERNAL_AI');

ALTER TABLE "SupportTeam" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "SupportCase" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "SupportCase" ADD COLUMN "topicId" TEXT;
ALTER TABLE "SupportCase" ADD COLUMN "topicFormId" TEXT;

CREATE TABLE "SupportDepartment" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "SupportCatalogStatus" NOT NULL DEFAULT 'ACTIVE',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportDepartment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTopic" (
  "id" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "SupportCatalogStatus" NOT NULL DEFAULT 'ACTIVE',
  "defaultPriority" "SupportCasePriority" NOT NULL DEFAULT 'NORMAL',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTopic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportRoutingRule" (
  "id" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "topicId" TEXT,
  "teamId" TEXT NOT NULL,
  "status" "SupportCatalogStatus" NOT NULL DEFAULT 'ACTIVE',
  "priority" INTEGER NOT NULL DEFAULT 100,
  "conditions" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportRoutingRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTeamMember" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "ChatParticipantRole" NOT NULL DEFAULT 'AGENT',
  "status" "SupportCatalogStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTopicForm" (
  "id" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "SupportCatalogStatus" NOT NULL DEFAULT 'ACTIVE',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTopicForm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTopicField" (
  "id" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "fieldType" "SupportFormFieldType" NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "sensitive" BOOLEAN NOT NULL DEFAULT false,
  "helpText" TEXT,
  "options" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTopicField_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportCaseFieldValue" (
  "id" TEXT NOT NULL,
  "supportCaseId" TEXT NOT NULL,
  "fieldId" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "sensitive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportCaseFieldValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTriageSuggestion" (
  "id" TEXT NOT NULL,
  "supportCaseId" TEXT,
  "requesterUserId" TEXT,
  "source" "SupportTriageSuggestionSource" NOT NULL,
  "inputHash" TEXT NOT NULL,
  "suggestedDepartmentId" TEXT,
  "suggestedTopicId" TEXT,
  "suggestedTeamId" TEXT,
  "confidence" DOUBLE PRECISION,
  "acceptedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTriageSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportDepartment_code_key" ON "SupportDepartment"("code");
CREATE INDEX "SupportDepartment_status_sortOrder_name_idx" ON "SupportDepartment"("status", "sortOrder", "name");
CREATE UNIQUE INDEX "SupportTopic_departmentId_code_key" ON "SupportTopic"("departmentId", "code");
CREATE INDEX "SupportTopic_departmentId_status_sortOrder_name_idx" ON "SupportTopic"("departmentId", "status", "sortOrder", "name");
CREATE INDEX "SupportRoutingRule_departmentId_topicId_status_priority_idx" ON "SupportRoutingRule"("departmentId", "topicId", "status", "priority");
CREATE INDEX "SupportRoutingRule_teamId_status_idx" ON "SupportRoutingRule"("teamId", "status");
CREATE UNIQUE INDEX "SupportTeamMember_teamId_userId_key" ON "SupportTeamMember"("teamId", "userId");
CREATE INDEX "SupportTeamMember_userId_status_idx" ON "SupportTeamMember"("userId", "status");
CREATE INDEX "SupportTeamMember_teamId_status_idx" ON "SupportTeamMember"("teamId", "status");
CREATE UNIQUE INDEX "SupportTopicForm_topicId_version_key" ON "SupportTopicForm"("topicId", "version");
CREATE INDEX "SupportTopicForm_topicId_status_version_idx" ON "SupportTopicForm"("topicId", "status", "version");
CREATE UNIQUE INDEX "SupportTopicField_formId_code_key" ON "SupportTopicField"("formId", "code");
CREATE INDEX "SupportTopicField_formId_sortOrder_idx" ON "SupportTopicField"("formId", "sortOrder");
CREATE UNIQUE INDEX "SupportCaseFieldValue_supportCaseId_fieldId_key" ON "SupportCaseFieldValue"("supportCaseId", "fieldId");
CREATE INDEX "SupportCaseFieldValue_fieldId_idx" ON "SupportCaseFieldValue"("fieldId");
CREATE INDEX "SupportCaseFieldValue_supportCaseId_idx" ON "SupportCaseFieldValue"("supportCaseId");
CREATE INDEX "SupportTriageSuggestion_requesterUserId_createdAt_idx" ON "SupportTriageSuggestion"("requesterUserId", "createdAt");
CREATE INDEX "SupportTriageSuggestion_source_createdAt_idx" ON "SupportTriageSuggestion"("source", "createdAt");
CREATE INDEX "SupportTriageSuggestion_suggestedDepartmentId_idx" ON "SupportTriageSuggestion"("suggestedDepartmentId");
CREATE INDEX "SupportTriageSuggestion_suggestedTopicId_idx" ON "SupportTriageSuggestion"("suggestedTopicId");
CREATE INDEX "SupportTriageSuggestion_suggestedTeamId_idx" ON "SupportTriageSuggestion"("suggestedTeamId");
CREATE INDEX "SupportTeam_departmentId_status_name_idx" ON "SupportTeam"("departmentId", "status", "name");
CREATE INDEX "SupportCase_departmentId_status_updatedAt_idx" ON "SupportCase"("departmentId", "status", "updatedAt");
CREATE INDEX "SupportCase_topicId_status_updatedAt_idx" ON "SupportCase"("topicId", "status", "updatedAt");

ALTER TABLE "SupportTeam" ADD CONSTRAINT "SupportTeam_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "SupportDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTopic" ADD CONSTRAINT "SupportTopic_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "SupportDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportRoutingRule" ADD CONSTRAINT "SupportRoutingRule_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "SupportDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportRoutingRule" ADD CONSTRAINT "SupportRoutingRule_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SupportTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportRoutingRule" ADD CONSTRAINT "SupportRoutingRule_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SupportTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTeamMember" ADD CONSTRAINT "SupportTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SupportTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTeamMember" ADD CONSTRAINT "SupportTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTopicForm" ADD CONSTRAINT "SupportTopicForm_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SupportTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTopicField" ADD CONSTRAINT "SupportTopicField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "SupportTopicForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "SupportDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SupportTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_topicFormId_fkey" FOREIGN KEY ("topicFormId") REFERENCES "SupportTopicForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportCaseFieldValue" ADD CONSTRAINT "SupportCaseFieldValue_supportCaseId_fkey" FOREIGN KEY ("supportCaseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportCaseFieldValue" ADD CONSTRAINT "SupportCaseFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "SupportTopicField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTriageSuggestion" ADD CONSTRAINT "SupportTriageSuggestion_supportCaseId_fkey" FOREIGN KEY ("supportCaseId") REFERENCES "SupportCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "SupportDepartment" ("id", "code", "name", "description", "sortOrder")
VALUES
  ('dept_finance', 'FINANCE', 'Financeiro', 'Pagamentos, reembolsos e assuntos financeiros.', 10),
  ('dept_medicine', 'MEDICINE', 'Medicina', 'ASO, atestados e saude ocupacional.', 20),
  ('dept_training', 'TRAINING', 'Treinamentos', 'Cursos, certificados e vencimentos de treinamento.', 30),
  ('dept_hr', 'HR', 'RH', 'Beneficios, ferias e apoio ao colaborador.', 40),
  ('dept_logistics', 'LOGISTICS', 'Logistica', 'Deslocamentos, embarques e apoio logistico.', 50),
  ('dept_payroll', 'PAYROLL', 'Departamento Pessoal', 'Contracheque, ponto, dados cadastrais e vinculos.', 60),
  ('dept_warehouse', 'WAREHOUSE', 'Almoxarifado', 'Materiais, uniformes e equipamentos.', 70),
  ('dept_sms', 'SMS', 'SMS', 'Seguranca, meio ambiente e saude operacional.', 80),
  ('dept_ti', 'TI', 'TI', 'Acesso, sistemas e suporte tecnico.', 90),
  ('dept_other', 'OTHER', 'Outros', 'Demandas que ainda nao se encaixam nos setores principais.', 100)
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "sortOrder" = EXCLUDED."sortOrder",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "SupportTeam" ("id", "departmentId", "code", "name", "status", "createdAt", "updatedAt")
VALUES
  ('team_finance', 'dept_finance', 'FINANCE', 'Financeiro', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('team_medicine_aso', 'dept_medicine', 'MEDICINE_ASO', 'Medicina / ASO', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('team_medicine_certificates', 'dept_medicine', 'MEDICINE_CERTIFICATES', 'Medicina / Atestados', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('team_training_certificates', 'dept_training', 'TRAINING_CERTIFICATES', 'Treinamentos / Certificados', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('team_hr', 'dept_hr', 'HR', 'RH', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('team_hr_vacation', 'dept_hr', 'HR_VACATION', 'RH / Ferias', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('team_logistics', 'dept_logistics', 'LOGISTICS', 'Logistica', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('team_payroll', 'dept_payroll', 'PAYROLL', 'Departamento Pessoal', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('team_payroll_payslip', 'dept_payroll', 'PAYROLL_PAYSLIP', 'Departamento Pessoal / Contracheque', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('team_warehouse', 'dept_warehouse', 'WAREHOUSE', 'Almoxarifado', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('team_sms', 'dept_sms', 'SMS', 'SMS', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('team_other', 'dept_other', 'OTHER', 'Triagem geral', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE
SET "departmentId" = EXCLUDED."departmentId",
    "name" = EXCLUDED."name",
    "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "SupportTeam"
SET "departmentId" = CASE "code"
  WHEN 'OPERATIONS' THEN 'dept_logistics'
  WHEN 'MEDICINE' THEN 'dept_medicine'
  WHEN 'TRAINING' THEN 'dept_training'
  WHEN 'TI' THEN 'dept_ti'
  WHEN 'SUPPORT' THEN 'dept_other'
  ELSE "departmentId"
END
WHERE "code" IN ('OPERATIONS', 'MEDICINE', 'TRAINING', 'TI', 'SUPPORT');

INSERT INTO "SupportTopic" ("id", "departmentId", "code", "name", "description", "defaultPriority", "sortOrder")
VALUES
  ('topic_finance_reimbursement', 'dept_finance', 'REIMBURSEMENT', 'Reembolso', 'Solicitacoes de reembolso e despesas.', 'NORMAL', 10),
  ('topic_medicine_aso', 'dept_medicine', 'ASO', 'ASO', 'Solicitacoes e duvidas sobre ASO.', 'HIGH', 10),
  ('topic_medicine_certificate', 'dept_medicine', 'MEDICAL_CERTIFICATE', 'Atestado', 'Envio ou acompanhamento de atestado.', 'HIGH', 20),
  ('topic_training_certificate', 'dept_training', 'CERTIFICATE', 'Certificado de treinamento', 'Certificados, cursos e comprovantes.', 'NORMAL', 10),
  ('topic_hr_vacation', 'dept_hr', 'VACATION', 'Ferias', 'Solicitacao ou duvida sobre ferias.', 'NORMAL', 10),
  ('topic_hr_benefits', 'dept_hr', 'BENEFITS', 'Beneficios', 'Beneficios e apoio ao colaborador.', 'NORMAL', 20),
  ('topic_logistics_boarding', 'dept_logistics', 'BOARDING', 'Embarque e deslocamento', 'Apoio sobre embarque, desembarque e deslocamento.', 'HIGH', 10),
  ('topic_payroll_payslip', 'dept_payroll', 'PAYSLIP', 'Contracheque', 'Acesso, duvida ou correcao de contracheque.', 'NORMAL', 10),
  ('topic_payroll_registration', 'dept_payroll', 'REGISTRATION', 'Dados cadastrais', 'Atualizacao ou duvida cadastral.', 'NORMAL', 20),
  ('topic_warehouse_uniform', 'dept_warehouse', 'UNIFORM', 'Uniforme ou material', 'Solicitacao de uniforme, material ou equipamento.', 'NORMAL', 10),
  ('topic_sms_incident', 'dept_sms', 'INCIDENT', 'Seguranca ou incidente', 'Registro ou duvida de seguranca operacional.', 'URGENT', 10),
  ('topic_ti_access', 'dept_ti', 'ACCESS', 'Acesso a sistemas', 'Acessos, senha e permissao em sistemas.', 'HIGH', 10),
  ('topic_other_general', 'dept_other', 'GENERAL', 'Nao encontrei meu assunto', 'Triagem para demandas nao classificadas.', 'NORMAL', 10)
ON CONFLICT ("departmentId", "code") DO UPDATE
SET "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "defaultPriority" = EXCLUDED."defaultPriority",
    "sortOrder" = EXCLUDED."sortOrder",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "SupportRoutingRule" ("id", "departmentId", "topicId", "teamId", "priority")
VALUES
  ('rule_finance_reimbursement', 'dept_finance', 'topic_finance_reimbursement', 'team_finance', 10),
  ('rule_medicine_aso', 'dept_medicine', 'topic_medicine_aso', 'team_medicine_aso', 10),
  ('rule_medicine_certificate', 'dept_medicine', 'topic_medicine_certificate', 'team_medicine_certificates', 10),
  ('rule_training_certificate', 'dept_training', 'topic_training_certificate', 'team_training_certificates', 10),
  ('rule_hr_vacation', 'dept_hr', 'topic_hr_vacation', 'team_hr_vacation', 10),
  ('rule_hr_benefits', 'dept_hr', 'topic_hr_benefits', 'team_hr', 20),
  ('rule_logistics_boarding', 'dept_logistics', 'topic_logistics_boarding', 'team_logistics', 10),
  ('rule_payroll_payslip', 'dept_payroll', 'topic_payroll_payslip', 'team_payroll_payslip', 10),
  ('rule_payroll_registration', 'dept_payroll', 'topic_payroll_registration', 'team_payroll', 20),
  ('rule_warehouse_uniform', 'dept_warehouse', 'topic_warehouse_uniform', 'team_warehouse', 10),
  ('rule_sms_incident', 'dept_sms', 'topic_sms_incident', 'team_sms', 10),
  ('rule_ti_access', 'dept_ti', 'topic_ti_access', 'team_ti', 10),
  ('rule_other_general', 'dept_other', 'topic_other_general', 'team_other', 100)
ON CONFLICT ("id") DO UPDATE
SET "departmentId" = EXCLUDED."departmentId",
    "topicId" = EXCLUDED."topicId",
    "teamId" = EXCLUDED."teamId",
    "priority" = EXCLUDED."priority",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "SupportTopicForm" ("id", "topicId", "version", "title", "description")
VALUES
  ('form_hr_vacation_v1', 'topic_hr_vacation', 1, 'Solicitacao de ferias', 'Campos minimos para iniciar analise de ferias.'),
  ('form_medicine_aso_v1', 'topic_medicine_aso', 1, 'Solicitacao de ASO', 'Campos minimos para orientar atendimento de ASO.'),
  ('form_medicine_certificate_v1', 'topic_medicine_certificate', 1, 'Envio de atestado', 'Campos minimos para encaminhar atestado.'),
  ('form_payroll_payslip_v1', 'topic_payroll_payslip', 1, 'Solicitacao de contracheque', 'Campos minimos para localizar contracheque.')
ON CONFLICT ("topicId", "version") DO UPDATE
SET "title" = EXCLUDED."title",
    "description" = EXCLUDED."description",
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "SupportTopicField" ("id", "formId", "code", "label", "fieldType", "required", "sensitive", "helpText", "options", "sortOrder")
VALUES
  ('field_hr_vacation_start_date', 'form_hr_vacation_v1', 'startDate', 'Data inicial', 'DATE', true, false, null, null, 10),
  ('field_hr_vacation_end_date', 'form_hr_vacation_v1', 'endDate', 'Data final', 'DATE', true, false, null, null, 20),
  ('field_hr_vacation_ack', 'form_hr_vacation_v1', 'policyAcknowledged', 'Estou ciente de que a solicitacao sera avaliada pelo setor', 'BOOLEAN', true, false, null, null, 30),
  ('field_medicine_aso_type', 'form_medicine_aso_v1', 'asoType', 'Tipo de ASO', 'SELECT', true, false, null, '["Admissional","Periodico","Retorno ao trabalho","Mudanca de risco","Demissional"]'::jsonb, 10),
  ('field_medicine_aso_preferred_date', 'form_medicine_aso_v1', 'preferredDate', 'Data desejada', 'DATE', false, false, null, null, 20),
  ('field_medicine_certificate_date', 'form_medicine_certificate_v1', 'certificateDate', 'Data do atestado', 'DATE', true, true, 'Evite informar diagnostico neste campo.', null, 10),
  ('field_medicine_certificate_days', 'form_medicine_certificate_v1', 'absenceDays', 'Quantidade de dias', 'NUMBER', true, true, null, null, 20),
  ('field_payroll_payslip_month', 'form_payroll_payslip_v1', 'referenceMonth', 'Mes de referencia', 'TEXT', true, false, 'Ex.: 08/2026', null, 10)
ON CONFLICT ("formId", "code") DO UPDATE
SET "label" = EXCLUDED."label",
    "fieldType" = EXCLUDED."fieldType",
    "required" = EXCLUDED."required",
    "sensitive" = EXCLUDED."sensitive",
    "helpText" = EXCLUDED."helpText",
    "options" = EXCLUDED."options",
    "sortOrder" = EXCLUDED."sortOrder",
    "updatedAt" = CURRENT_TIMESTAMP;
