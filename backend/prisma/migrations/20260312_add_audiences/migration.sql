-- CreateEnum
CREATE TYPE "AudienceStatus" AS ENUM ('PROCESSING', 'READY', 'ERROR');

-- CreateTable
CREATE TABLE "audiences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "externalId" TEXT,
    "status" "AudienceStatus" NOT NULL DEFAULT 'PROCESSING',
    "errorMessage" TEXT,
    "emailCount" INTEGER NOT NULL DEFAULT 0,
    "approximateSize" INTEGER,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,

    CONSTRAINT "audiences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audiences_userId_idx" ON "audiences"("userId");

-- CreateIndex
CREATE INDEX "audiences_platformId_idx" ON "audiences"("platformId");

-- CreateIndex
CREATE INDEX "audiences_status_idx" ON "audiences"("status");

-- AddForeignKey
ALTER TABLE "audiences" ADD CONSTRAINT "audiences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audiences" ADD CONSTRAINT "audiences_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
