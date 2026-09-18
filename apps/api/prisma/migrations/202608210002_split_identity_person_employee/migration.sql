-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "cpf" TEXT,
    "birthDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "externalEmployeeId" TEXT,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "personId" TEXT;

-- Seed existing users into Person
INSERT INTO "Person" ("id", "fullName", "createdAt", "updatedAt")
SELECT
    'prs_' || md5("id"),
    "fullName",
    "createdAt",
    "updatedAt"
FROM "User";

-- Link users to their person record
UPDATE "User"
SET "personId" = 'prs_' || md5("id");

-- Project existing employee ids into Employee
INSERT INTO "Employee" (
    "id",
    "personId",
    "employeeNumber",
    "externalEmployeeId",
    "createdAt",
    "updatedAt"
)
SELECT
    'emp_' || md5("id"),
    'prs_' || md5("id"),
    "employeeId",
    "employeeId",
    "createdAt",
    "updatedAt"
FROM "User"
WHERE "employeeId" IS NOT NULL;

-- Tighten constraints after backfill
ALTER TABLE "User" ALTER COLUMN "personId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Person_cpf_key" ON "Person"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_personId_key" ON "Employee"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeNumber_key" ON "Employee"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_externalEmployeeId_key" ON "Employee"("externalEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_personId_key" ON "User"("personId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop legacy columns after data migration
DROP INDEX IF EXISTS "User_employeeId_key";
ALTER TABLE "User" DROP COLUMN "employeeId";
ALTER TABLE "User" DROP COLUMN "fullName";
