-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "subscriptionPlan" TEXT NOT NULL DEFAULT 'PRO';
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP(3);
