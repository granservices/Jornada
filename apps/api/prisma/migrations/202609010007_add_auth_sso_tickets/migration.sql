CREATE TABLE "AuthSsoTicket" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuthSsoTicket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthSsoTicket_tokenHash_key" ON "AuthSsoTicket"("tokenHash");
CREATE INDEX "AuthSsoTicket_userId_expiresAt_idx" ON "AuthSsoTicket"("userId", "expiresAt");
CREATE INDEX "AuthSsoTicket_expiresAt_idx" ON "AuthSsoTicket"("expiresAt");

ALTER TABLE "AuthSsoTicket"
  ADD CONSTRAINT "AuthSsoTicket_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuthSsoTicket"
  ADD CONSTRAINT "AuthSsoTicket_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
