-- CreateEnum
CREATE TYPE "UserProfileNotificationChannel" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP', 'NONE');

-- CreateTable
CREATE TABLE "UserProfilePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredName" TEXT,
    "phoneNumber" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "primaryBase" TEXT,
    "notificationChannel" "UserProfileNotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfilePreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfilePreference_userId_key" ON "UserProfilePreference"("userId");

-- CreateIndex
CREATE INDEX "UserProfilePreference_notificationChannel_idx" ON "UserProfilePreference"("notificationChannel");

-- AddForeignKey
ALTER TABLE "UserProfilePreference" ADD CONSTRAINT "UserProfilePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
