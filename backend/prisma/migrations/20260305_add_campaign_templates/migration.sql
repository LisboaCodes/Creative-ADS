-- CreateTable
CREATE TABLE "campaign_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "campaignSetup" JSONB NOT NULL,
    "adSetSetup" JSONB NOT NULL,
    "creativeSetup" JSONB NOT NULL,
    "benchmarks" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "tips" TEXT[],
    "commonMistakes" TEXT[],
    "scalingGuide" TEXT,
    "source" TEXT,
    "year" INTEGER NOT NULL DEFAULT 2025,
    "difficulty" TEXT NOT NULL DEFAULT 'intermediario',
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_templates_niche_idx" ON "campaign_templates"("niche");
CREATE INDEX "campaign_templates_platform_idx" ON "campaign_templates"("platform");
CREATE INDEX "campaign_templates_objective_idx" ON "campaign_templates"("objective");
CREATE INDEX "campaign_templates_category_idx" ON "campaign_templates"("category");
