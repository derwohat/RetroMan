-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('MUSIC', 'VIDEO', 'GAME', 'BOOK', 'CONSOLE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('MINT', 'VERY_GOOD', 'GOOD', 'USED', 'POOR');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('OPENED', 'SEALED', 'GRADED');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('OWNED', 'WISHLIST');

-- CreateEnum
CREATE TYPE "ViewType" AS ENUM ('SHELF', 'SPINE', 'CDWALL', 'SIMPLE', 'TABLE');

-- CreateEnum
CREATE TYPE "SortOrder" AS ENUM ('ASC', 'DESC');

-- CreateEnum
CREATE TYPE "DateFormat" AS ENUM ('EUROPEAN', 'AMERICAN');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT', 'BOOLEAN', 'TEXTAREA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "preferredLanguage" TEXT NOT NULL DEFAULT 'de',
    "preferredRegion" TEXT NOT NULL DEFAULT 'PAL-EU',
    "dateFormat" "DateFormat" NOT NULL DEFAULT 'EUROPEAN',
    "gdprConsentAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "tmdbApiKey" TEXT,
    "igdbClientId" TEXT,
    "igdbSecret" TEXT,
    "discogsApiKey" TEXT,
    "pricechartingKey" TEXT,
    "theGamesDbKey" TEXT,
    "mobyGamesKey" TEXT,
    "donationUrl" TEXT,
    "githubUrl" TEXT,
    "requireMfa" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "mediaType" "MediaType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryField" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldType" "FieldType" NOT NULL,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DECIMAL(10,2),
    "store" TEXT,
    "condition" "Condition",
    "itemStatus" "ItemStatus",
    "location" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "barcode" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "rating" INTEGER,
    "collectionStatus" "CollectionStatus" NOT NULL DEFAULT 'OWNED',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "externalId" TEXT,
    "externalSource" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemImage" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "url" TEXT,
    "filePath" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCustomField" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ItemCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemTag" (
    "itemId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ItemTag_pkey" PRIMARY KEY ("itemId","tagId")
);

-- CreateTable
CREATE TABLE "GradingInfo" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "score" TEXT NOT NULL,
    "gradedAt" TIMESTAMP(3),
    "caseImagePath" TEXT,

    CONSTRAINT "GradingInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionViewSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "viewType" "ViewType" NOT NULL,
    "visibleTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortBy" TEXT NOT NULL DEFAULT 'title',
    "sortOrder" "SortOrder" NOT NULL DEFAULT 'ASC',

    CONSTRAINT "CollectionViewSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "regionOverride" TEXT,

    CONSTRAINT "CollectionSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryField_categoryId_fieldKey_key" ON "CategoryField"("categoryId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "ItemCustomField_itemId_fieldId_key" ON "ItemCustomField"("itemId", "fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GradingInfo_itemId_key" ON "GradingInfo"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionViewSettings_userId_categoryId_viewType_key" ON "CollectionViewSettings"("userId", "categoryId", "viewType");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionSettings_userId_categoryId_key" ON "CollectionSettings"("userId", "categoryId");

-- AddForeignKey
ALTER TABLE "CategoryField" ADD CONSTRAINT "CategoryField_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemImage" ADD CONSTRAINT "ItemImage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCustomField" ADD CONSTRAINT "ItemCustomField_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCustomField" ADD CONSTRAINT "ItemCustomField_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CategoryField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTag" ADD CONSTRAINT "ItemTag_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTag" ADD CONSTRAINT "ItemTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingInfo" ADD CONSTRAINT "GradingInfo_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionViewSettings" ADD CONSTRAINT "CollectionViewSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionViewSettings" ADD CONSTRAINT "CollectionViewSettings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionSettings" ADD CONSTRAINT "CollectionSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionSettings" ADD CONSTRAINT "CollectionSettings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
