-- AlterTable: drop defaultVisibleTags column from Category
ALTER TABLE "Category" DROP COLUMN IF EXISTS "defaultVisibleTags";

-- CreateTable: CategoryTagGroup
CREATE TABLE "CategoryTagGroup" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "showInView" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryTagGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTagGroup_categoryId_groupId_key" ON "CategoryTagGroup"("categoryId", "groupId");

-- AddForeignKey
ALTER TABLE "CategoryTagGroup" ADD CONSTRAINT "CategoryTagGroup_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryTagGroup" ADD CONSTRAINT "CategoryTagGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TagGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
