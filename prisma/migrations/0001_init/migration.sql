-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('MUSIC', 'VIDEO', 'FILM', 'SERIE', 'GAME', 'BOOK', 'COMIC', 'MANGA', 'CONSOLE', 'CUSTOM');

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
    "googleSearchKey" TEXT,
    "googleSearchCx" TEXT,
    "omdbApiKey" TEXT,
    "comicVineKey" TEXT,
    "donationUrl" TEXT,
    "githubUrl" TEXT,
    "requireMfa" BOOLEAN NOT NULL DEFAULT false,
    "fontSize" TEXT NOT NULL DEFAULT 'medium',
    "interfaceLanguage" TEXT NOT NULL DEFAULT 'de',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#ff2d95',
    "linkedField" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "mediaType" "MediaType" NOT NULL DEFAULT 'CUSTOM',
    "customMediaTypeLabel" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "gradingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionField" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldType" "FieldType" NOT NULL,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionTagGroup" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "showInView" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionTagGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
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
    "videoFormat" TEXT,
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
CREATE TABLE "ItemTag" (
    "itemId" TEXT NOT NULL,
    "tagValueId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "ItemTag_pkey" PRIMARY KEY ("itemId","tagValueId")
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
    "collectionId" TEXT NOT NULL,
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
    "collectionId" TEXT NOT NULL,
    "regionOverride" TEXT,

    CONSTRAINT "CollectionSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TagGroup_name_key" ON "TagGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TagValue_groupId_value_key" ON "TagValue"("groupId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionField_collectionId_fieldKey_key" ON "CollectionField"("collectionId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionTagGroup_collectionId_groupId_key" ON "CollectionTagGroup"("collectionId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemCustomField_itemId_fieldId_key" ON "ItemCustomField"("itemId", "fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "GradingInfo_itemId_key" ON "GradingInfo"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionViewSettings_userId_collectionId_viewType_key" ON "CollectionViewSettings"("userId", "collectionId", "viewType");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionSettings_userId_collectionId_key" ON "CollectionSettings"("userId", "collectionId");

-- AddForeignKey
ALTER TABLE "TagValue" ADD CONSTRAINT "TagValue_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TagGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionField" ADD CONSTRAINT "CollectionField_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTagGroup" ADD CONSTRAINT "CollectionTagGroup_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTagGroup" ADD CONSTRAINT "CollectionTagGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TagGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemImage" ADD CONSTRAINT "ItemImage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCustomField" ADD CONSTRAINT "ItemCustomField_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCustomField" ADD CONSTRAINT "ItemCustomField_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CollectionField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTag" ADD CONSTRAINT "ItemTag_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTag" ADD CONSTRAINT "ItemTag_tagValueId_fkey" FOREIGN KEY ("tagValueId") REFERENCES "TagValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTag" ADD CONSTRAINT "ItemTag_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TagGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingInfo" ADD CONSTRAINT "GradingInfo_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionViewSettings" ADD CONSTRAINT "CollectionViewSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionViewSettings" ADD CONSTRAINT "CollectionViewSettings_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionSettings" ADD CONSTRAINT "CollectionSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionSettings" ADD CONSTRAINT "CollectionSettings_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

