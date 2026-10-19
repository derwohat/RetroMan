-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "sessionAbsoluteHours" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "sessionIdleMinutes" INTEGER NOT NULL DEFAULT 60;
