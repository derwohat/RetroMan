-- CreateTable: Collection
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- Data: seed one Collection per existing Category, reuse category.id as collection.id
-- so /collection/[categoryId] URLs remain valid after the rename
INSERT INTO "Collection" ("id", "name", "categoryId", "order", "createdAt")
SELECT "id", "name", "id", "order", "createdAt" FROM "Category";

-- AlterTable Item: add collectionId (nullable first to allow data fill)
ALTER TABLE "Item" ADD COLUMN "collectionId" TEXT;

-- Data: fill from categoryId (which equals collection.id for migrated rows)
UPDATE "Item" SET "collectionId" = "categoryId";

-- Make NOT NULL
ALTER TABLE "Item" ALTER COLUMN "collectionId" SET NOT NULL;

-- Drop old FK and column
ALTER TABLE "Item" DROP CONSTRAINT "Item_categoryId_fkey";
ALTER TABLE "Item" DROP COLUMN "categoryId";

-- AlterTable CollectionViewSettings: add collectionId
ALTER TABLE "CollectionViewSettings" ADD COLUMN "collectionId" TEXT;

-- Data: fill
UPDATE "CollectionViewSettings" SET "collectionId" = "categoryId";

-- Make NOT NULL
ALTER TABLE "CollectionViewSettings" ALTER COLUMN "collectionId" SET NOT NULL;

-- Drop old unique index, create new one
DROP INDEX "CollectionViewSettings_userId_categoryId_viewType_key";
CREATE UNIQUE INDEX "CollectionViewSettings_userId_collectionId_viewType_key" ON "CollectionViewSettings"("userId", "collectionId", "viewType");

-- Drop old FK and column
ALTER TABLE "CollectionViewSettings" DROP CONSTRAINT "CollectionViewSettings_categoryId_fkey";
ALTER TABLE "CollectionViewSettings" DROP COLUMN "categoryId";

-- AlterTable CollectionSettings: add collectionId
ALTER TABLE "CollectionSettings" ADD COLUMN "collectionId" TEXT;

-- Data: fill
UPDATE "CollectionSettings" SET "collectionId" = "categoryId";

-- Make NOT NULL
ALTER TABLE "CollectionSettings" ALTER COLUMN "collectionId" SET NOT NULL;

-- Drop old unique index, create new one
DROP INDEX "CollectionSettings_userId_categoryId_key";
CREATE UNIQUE INDEX "CollectionSettings_userId_collectionId_key" ON "CollectionSettings"("userId", "collectionId");

-- Drop old FK and column
ALTER TABLE "CollectionSettings" DROP CONSTRAINT "CollectionSettings_categoryId_fkey";
ALTER TABLE "CollectionSettings" DROP COLUMN "categoryId";

-- AddForeignKey: Collection → Category
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Item → Collection
ALTER TABLE "Item" ADD CONSTRAINT "Item_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: CollectionViewSettings → Collection
ALTER TABLE "CollectionViewSettings" ADD CONSTRAINT "CollectionViewSettings_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: CollectionSettings → Collection
ALTER TABLE "CollectionSettings" ADD CONSTRAINT "CollectionSettings_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
