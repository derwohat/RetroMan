-- Migration: add userId to Collection (required) and TagGroup (optional)
-- Existing records are assigned to the first admin user found in the database.

-- Drop the global unique constraint on TagGroup.name (names are now per-user)
DROP INDEX "TagGroup_name_key";

-- Step 1: Add userId as nullable first so existing rows don't violate NOT NULL
ALTER TABLE "Collection" ADD COLUMN "userId" TEXT;
ALTER TABLE "TagGroup"   ADD COLUMN "userId" TEXT;

-- Step 2: Assign all existing collections to the first admin (or any user as fallback)
UPDATE "Collection"
SET "userId" = (
  SELECT id FROM "User"
  WHERE "deletedAt" IS NULL
  ORDER BY
    CASE WHEN role = 'ADMIN' THEN 0 ELSE 1 END,
    "createdAt" ASC
  LIMIT 1
)
WHERE "userId" IS NULL;

-- Step 3: Assign existing user-created tag groups (isSystem = false) to first admin
UPDATE "TagGroup"
SET "userId" = (
  SELECT id FROM "User"
  WHERE "deletedAt" IS NULL
  ORDER BY
    CASE WHEN role = 'ADMIN' THEN 0 ELSE 1 END,
    "createdAt" ASC
  LIMIT 1
)
WHERE "isSystem" = false AND "userId" IS NULL;

-- Step 4: Make Collection.userId NOT NULL
ALTER TABLE "Collection" ALTER COLUMN "userId" SET NOT NULL;

-- Step 5: Add foreign key constraints
ALTER TABLE "TagGroup" ADD CONSTRAINT "TagGroup_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
