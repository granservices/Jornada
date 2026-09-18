CREATE TABLE "FormResponse" (
  "id" TEXT NOT NULL,
  "formRequestId" TEXT NOT NULL,
  "submittedByUserId" TEXT NOT NULL,
  "values" JSONB NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FormResponse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FormResponse_formRequestId_key" ON "FormResponse"("formRequestId");
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_formRequestId_fkey" FOREIGN KEY ("formRequestId") REFERENCES "FormRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
