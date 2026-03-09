-- CreateTable
CREATE TABLE "ad_sets" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL,
    "dailyBudget" DOUBLE PRECISION,
    "lifetimeBudget" DOUBLE PRECISION,
    "targeting" JSONB,
    "optimizationGoal" TEXT,
    "billingEvent" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "ad_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adSetId" TEXT NOT NULL,
    "creativeId" TEXT,

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ad_sets_campaignId_idx" ON "ad_sets"("campaignId");

-- CreateIndex
CREATE INDEX "ad_sets_status_idx" ON "ad_sets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ad_sets_campaignId_externalId_key" ON "ad_sets"("campaignId", "externalId");

-- CreateIndex
CREATE INDEX "ads_adSetId_idx" ON "ads"("adSetId");

-- CreateIndex
CREATE INDEX "ads_status_idx" ON "ads"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ads_adSetId_externalId_key" ON "ads"("adSetId", "externalId");

-- AddForeignKey
ALTER TABLE "ad_sets" ADD CONSTRAINT "ad_sets_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_adSetId_fkey" FOREIGN KEY ("adSetId") REFERENCES "ad_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "ad_creatives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
