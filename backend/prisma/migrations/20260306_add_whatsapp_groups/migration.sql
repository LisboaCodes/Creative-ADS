-- CreateTable
CREATE TABLE "whatsapp_groups" (
    "id" TEXT NOT NULL,
    "groupJid" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "platformIds" TEXT[],
    "notifyStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "notifyBudgetChange" BOOLEAN NOT NULL DEFAULT true,
    "notifyPerformance" BOOLEAN NOT NULL DEFAULT true,
    "notifyDailySummary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "whatsapp_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_groups_userId_idx" ON "whatsapp_groups"("userId");

-- AddForeignKey
ALTER TABLE "whatsapp_groups" ADD CONSTRAINT "whatsapp_groups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
