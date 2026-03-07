-- AlterEnum
ALTER TYPE "CampaignStatus" ADD VALUE 'DRAFT';

-- AlterTable: make externalId nullable and add draftData
ALTER TABLE "campaigns" ALTER COLUMN "externalId" DROP NOT NULL;
ALTER TABLE "campaigns" ADD COLUMN "draftData" JSONB;

-- Drop the old unique constraint and recreate it (nullable externalId)
-- PostgreSQL allows multiple NULLs in unique constraints by default, so no WHERE clause needed
ALTER TABLE "campaigns" DROP CONSTRAINT IF EXISTS "campaigns_platformId_externalId_key";
DROP INDEX IF EXISTS "campaigns_platformId_externalId_key";
CREATE UNIQUE INDEX "campaigns_platformId_externalId_key" ON "campaigns"("platformId", "externalId");
