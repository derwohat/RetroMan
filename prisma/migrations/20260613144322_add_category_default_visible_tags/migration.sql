-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "defaultVisibleTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
