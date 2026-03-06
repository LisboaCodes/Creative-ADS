-- Rename Facebook-specific columns to generic names
ALTER TABLE "platform_logins" RENAME COLUMN "facebookUserId" TO "externalUserId";
ALTER TABLE "platform_logins" RENAME COLUMN "facebookUserName" TO "externalUserName";
ALTER TABLE "platform_logins" RENAME COLUMN "businessManagers" TO "platformMetadata";

-- Drop old unique constraint and create new one with platformType
DROP INDEX "platform_logins_userId_facebookUserId_key";
CREATE UNIQUE INDEX "platform_logins_userId_platformType_externalUserId_key" ON "platform_logins"("userId", "platformType", "externalUserId");
