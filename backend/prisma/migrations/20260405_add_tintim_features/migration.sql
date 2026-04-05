-- CreateEnum
CREATE TYPE "MetaConversionEvent" AS ENUM ('ViewContent', 'Lead', 'Purchase', 'AddPaymentInfo', 'AddToCart', 'AddToWishlist', 'CompleteRegistration', 'Contact', 'CustomizeProduct', 'Donate', 'FindLocation', 'InitiateCheckout', 'Schedule', 'Search', 'StartTrial', 'SubmitApplication', 'Subscribe');

-- CreateEnum
CREATE TYPE "WebhookEventType" AS ENUM ('NEW_LEAD', 'LEAD_STAGE_CHANGE', 'SALE_COMPLETED', 'LEAD_UPDATED');

-- AlterTable - TrackingLink WhatsApp fields
ALTER TABLE "tracking_links" ADD COLUMN "whatsappMessage" TEXT;
ALTER TABLE "tracking_links" ADD COLUMN "whatsappRedirect" TEXT DEFAULT 'app';
ALTER TABLE "tracking_links" ADD COLUMN "isMetaAds" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tracking_links" ADD COLUMN "redirectPageTitle" TEXT;
ALTER TABLE "tracking_links" ADD COLUMN "redirectPageMessage" TEXT;
ALTER TABLE "tracking_links" ADD COLUMN "whatsappNumber" TEXT;

-- AlterTable - Lead journey fields
ALTER TABLE "leads" ADD COLUMN "currentJourneyStageId" TEXT;

-- CreateTable
CREATE TABLE "journey_stages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "funnelOrder" INTEGER NOT NULL,
    "conversionEvent" "MetaConversionEvent",
    "isSaleStage" BOOLEAN NOT NULL DEFAULT false,
    "isFirstContact" BOOLEAN NOT NULL DEFAULT false,
    "triggerKeyword" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "journey_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_journey_logs" (
    "id" TEXT NOT NULL,
    "changedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT NOT NULL,
    "journeyStageId" TEXT NOT NULL,

    CONSTRAINT "lead_journey_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversion_event_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "metaEventName" "MetaConversionEvent",
    "metaPixelId" TEXT,
    "metaAccessToken" TEXT,
    "googleConversionAction" TEXT,
    "googleCustomerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoSend" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "journeyStageId" TEXT,

    CONSTRAINT "conversion_event_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pixel_configs" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "pixelId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "testEventCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "pixel_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "events" "WebhookEventType"[],
    "retryCount" INTEGER NOT NULL DEFAULT 3,
    "timeoutMs" INTEGER NOT NULL DEFAULT 5000,
    "stats" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "eventType" "WebhookEventType" NOT NULL,
    "payload" JSONB NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "duration" INTEGER,
    "error" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endpointId" TEXT NOT NULL,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trackable_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "messageTemplate" TEXT NOT NULL,
    "gclid" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "trackable_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_access" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "client_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "journey_stages_userId_idx" ON "journey_stages"("userId");
CREATE INDEX "journey_stages_funnelOrder_idx" ON "journey_stages"("funnelOrder");

-- CreateIndex
CREATE INDEX "lead_journey_logs_leadId_idx" ON "lead_journey_logs"("leadId");
CREATE INDEX "lead_journey_logs_journeyStageId_idx" ON "lead_journey_logs"("journeyStageId");

-- CreateIndex
CREATE INDEX "conversion_event_configs_userId_idx" ON "conversion_event_configs"("userId");
CREATE INDEX "conversion_event_configs_journeyStageId_idx" ON "conversion_event_configs"("journeyStageId");

-- CreateIndex
CREATE INDEX "pixel_configs_userId_idx" ON "pixel_configs"("userId");

-- CreateIndex
CREATE INDEX "webhook_endpoints_userId_idx" ON "webhook_endpoints"("userId");

-- CreateIndex
CREATE INDEX "webhook_deliveries_endpointId_idx" ON "webhook_deliveries"("endpointId");
CREATE INDEX "webhook_deliveries_createdAt_idx" ON "webhook_deliveries"("createdAt");

-- CreateIndex
CREATE INDEX "trackable_messages_userId_idx" ON "trackable_messages"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "client_access_userId_clientId_key" ON "client_access"("userId", "clientId");
CREATE INDEX "client_access_userId_idx" ON "client_access"("userId");
CREATE INDEX "client_access_clientId_idx" ON "client_access"("clientId");

-- CreateIndex
CREATE INDEX "leads_currentJourneyStageId_idx" ON "leads"("currentJourneyStageId");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_currentJourneyStageId_fkey" FOREIGN KEY ("currentJourneyStageId") REFERENCES "journey_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_stages" ADD CONSTRAINT "journey_stages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_journey_logs" ADD CONSTRAINT "lead_journey_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_journey_logs" ADD CONSTRAINT "lead_journey_logs_journeyStageId_fkey" FOREIGN KEY ("journeyStageId") REFERENCES "journey_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversion_event_configs" ADD CONSTRAINT "conversion_event_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversion_event_configs" ADD CONSTRAINT "conversion_event_configs_journeyStageId_fkey" FOREIGN KEY ("journeyStageId") REFERENCES "journey_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pixel_configs" ADD CONSTRAINT "pixel_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trackable_messages" ADD CONSTRAINT "trackable_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_access" ADD CONSTRAINT "client_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_access" ADD CONSTRAINT "client_access_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
