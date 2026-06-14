-- DropForeignKey
ALTER TABLE "ItemTag" DROP CONSTRAINT "ItemTag_tagId_fkey";

-- AlterTable
ALTER TABLE "ItemTag" DROP CONSTRAINT "ItemTag_pkey",
DROP COLUMN "tagId",
ADD COLUMN     "groupId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tagValueId" TEXT NOT NULL DEFAULT '',
ADD CONSTRAINT "ItemTag_pkey" PRIMARY KEY ("itemId", "tagValueId");

-- Remove defaults after altering (columns are now NOT NULL)
ALTER TABLE "ItemTag" ALTER COLUMN "groupId" DROP DEFAULT;
ALTER TABLE "ItemTag" ALTER COLUMN "tagValueId" DROP DEFAULT;

-- DropTable
DROP TABLE "Store";

-- DropTable
DROP TABLE "Tag";

-- CreateTable
CREATE TABLE "TagGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TagGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagValue" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TagValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TagGroup_name_key" ON "TagGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TagValue_groupId_value_key" ON "TagValue"("groupId", "value");

-- AddForeignKey
ALTER TABLE "TagValue" ADD CONSTRAINT "TagValue_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TagGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTag" ADD CONSTRAINT "ItemTag_tagValueId_fkey" FOREIGN KEY ("tagValueId") REFERENCES "TagValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTag" ADD CONSTRAINT "ItemTag_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TagGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
