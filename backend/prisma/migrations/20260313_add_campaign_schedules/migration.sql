-- CreateTable
CREATE TABLE "campaign_schedules" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'once',
    "pauseDuration" INTEGER NOT NULL,
    "resumeDuration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentAction" TEXT,
    "jobId" TEXT,
    "nextActionAt" TIMESTAMP(3),
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "maxExecutions" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "campaign_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_schedules_userId_idx" ON "campaign_schedules"("userId");

-- CreateIndex
CREATE INDEX "campaign_schedules_status_idx" ON "campaign_schedules"("status");

-- AddForeignKey
ALTER TABLE "campaign_schedules" ADD CONSTRAINT "campaign_schedules_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_schedules" ADD CONSTRAINT "campaign_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
