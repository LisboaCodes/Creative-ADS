-- CreateTable
CREATE TABLE "ad_creatives" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT,
    "thumbnailUrl" TEXT,
    "imageUrl" TEXT,
    "body" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "ad_creatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ad_creatives_campaignId_idx" ON "ad_creatives"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "ad_creatives_campaignId_externalId_key" ON "ad_creatives"("campaignId", "externalId");

-- AddForeignKey
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
