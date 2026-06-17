-- ── Step 1: Add new columns to Collection (nullable first for data copy) ─────
ALTER TABLE "Collection"
  ADD COLUMN "icon"                 TEXT,
  ADD COLUMN "customMediaTypeLabel" TEXT,
  ADD COLUMN "gradingEnabled"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mediaType"            "MediaType";

-- ── Step 2: Copy Category data into Collection ────────────────────────────────
UPDATE "Collection" c
SET
  "icon"                 = cat."icon",
  "mediaType"            = cat."mediaType",
  "customMediaTypeLabel" = cat."customMediaTypeLabel",
  "gradingEnabled"       = cat."gradingEnabled"
FROM "Category" cat
WHERE c."categoryId" = cat."id";

-- Fill any remaining NULLs with default
UPDATE "Collection" SET "mediaType" = 'CUSTOM' WHERE "mediaType" IS NULL;

-- ── Step 3: Make mediaType NOT NULL ──────────────────────────────────────────
ALTER TABLE "Collection" ALTER COLUMN "mediaType" SET NOT NULL;

-- ── Step 4: Create CollectionField ───────────────────────────────────────────
CREATE TABLE "CollectionField" (
  "id"           TEXT          NOT NULL,
  "collectionId" TEXT          NOT NULL,
  "name"         TEXT          NOT NULL,
  "fieldKey"     TEXT          NOT NULL,
  "fieldType"    "FieldType"   NOT NULL,
  "options"      TEXT[]        NOT NULL DEFAULT ARRAY[]::TEXT[],
  "order"        INTEGER       NOT NULL DEFAULT 0,
  "required"     BOOLEAN       NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectionField_pkey" PRIMARY KEY ("id")
);

-- Copy CategoryField records, mapping categoryId → collectionId (1:1)
INSERT INTO "CollectionField" ("id","collectionId","name","fieldKey","fieldType","options","order","required","createdAt")
SELECT
  cf."id",
  c."id"           AS "collectionId",
  cf."name",
  cf."fieldKey",
  cf."fieldType",
  cf."options",
  cf."order",
  cf."required",
  cf."createdAt"
FROM "CategoryField" cf
JOIN "Collection"    c  ON c."categoryId" = cf."categoryId";

CREATE UNIQUE INDEX "CollectionField_collectionId_fieldKey_key"
  ON "CollectionField"("collectionId","fieldKey");

ALTER TABLE "CollectionField"
  ADD CONSTRAINT "CollectionField_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Step 5: Create CollectionTagGroup ────────────────────────────────────────
CREATE TABLE "CollectionTagGroup" (
  "id"           TEXT          NOT NULL,
  "collectionId" TEXT          NOT NULL,
  "groupId"      TEXT          NOT NULL,
  "showInView"   BOOLEAN       NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectionTagGroup_pkey" PRIMARY KEY ("id")
);

-- Copy CategoryTagGroup records, mapping categoryId → collectionId (1:1)
INSERT INTO "CollectionTagGroup" ("id","collectionId","groupId","showInView","createdAt")
SELECT
  ctg."id",
  c."id"           AS "collectionId",
  ctg."groupId",
  ctg."showInView",
  ctg."createdAt"
FROM "CategoryTagGroup" ctg
JOIN "Collection"        c ON c."categoryId" = ctg."categoryId";

CREATE UNIQUE INDEX "CollectionTagGroup_collectionId_groupId_key"
  ON "CollectionTagGroup"("collectionId","groupId");

ALTER TABLE "CollectionTagGroup"
  ADD CONSTRAINT "CollectionTagGroup_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollectionTagGroup"
  ADD CONSTRAINT "CollectionTagGroup_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "TagGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Step 6: Re-point ItemCustomField FK to CollectionField ───────────────────
-- (IDs are preserved, so no data update needed — just swap the FK constraint)
ALTER TABLE "ItemCustomField" DROP CONSTRAINT "ItemCustomField_fieldId_fkey";
ALTER TABLE "ItemCustomField"
  ADD CONSTRAINT "ItemCustomField_fieldId_fkey"
  FOREIGN KEY ("fieldId") REFERENCES "CollectionField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Step 7: Drop old Category tables and categoryId column ───────────────────
ALTER TABLE "CategoryField"    DROP CONSTRAINT "CategoryField_categoryId_fkey";
ALTER TABLE "CategoryTagGroup" DROP CONSTRAINT "CategoryTagGroup_categoryId_fkey";
ALTER TABLE "CategoryTagGroup" DROP CONSTRAINT "CategoryTagGroup_groupId_fkey";
ALTER TABLE "Collection"       DROP CONSTRAINT "Collection_categoryId_fkey";

DROP TABLE "CategoryField";
DROP TABLE "CategoryTagGroup";
DROP TABLE "Category";

ALTER TABLE "Collection" DROP COLUMN "categoryId";
