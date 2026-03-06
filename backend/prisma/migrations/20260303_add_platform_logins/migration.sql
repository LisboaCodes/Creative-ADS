-- CreateTable
CREATE TABLE "platform_logins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platformType" "PlatformType" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "facebookUserId" TEXT NOT NULL,
    "facebookUserName" TEXT,
    "businessManagers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_logins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_logins_userId_facebookUserId_key" ON "platform_logins"("userId", "facebookUserId");

-- CreateIndex
CREATE INDEX "platform_logins_userId_idx" ON "platform_logins"("userId");

-- AddForeignKey
ALTER TABLE "platform_logins" ADD CONSTRAINT "platform_logins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "platforms" ADD COLUMN "platformLoginId" TEXT;
ALTER TABLE "platforms" ADD COLUMN "businessManagerId" TEXT;
ALTER TABLE "platforms" ADD COLUMN "businessManagerName" TEXT;

-- CreateIndex
CREATE INDEX "platforms_platformLoginId_idx" ON "platforms"("platformLoginId");

-- AddForeignKey
ALTER TABLE "platforms" ADD CONSTRAINT "platforms_platformLoginId_fkey" FOREIGN KEY ("platformLoginId") REFERENCES "platform_logins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
