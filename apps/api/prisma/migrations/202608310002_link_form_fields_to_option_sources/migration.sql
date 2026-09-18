ALTER TABLE "SupportTopicField"
ADD COLUMN "optionSourceKey" TEXT;

CREATE INDEX "SupportTopicField_optionSourceKey_idx"
ON "SupportTopicField"("optionSourceKey");

ALTER TABLE "SupportTopicField"
ADD CONSTRAINT "SupportTopicField_optionSourceKey_fkey"
FOREIGN KEY ("optionSourceKey") REFERENCES "OptionSource"("key")
ON DELETE RESTRICT ON UPDATE CASCADE;
