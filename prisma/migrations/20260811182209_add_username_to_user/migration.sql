-- AlterTable: add username as nullable first, backfill, then enforce NOT NULL + UNIQUE.
-- Hand-written (not `prisma migrate dev`) because existing rows need a derived
-- value before the NOT NULL constraint can be applied.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Backfill from the email local-part, lowercased, sanitized to the allowed
-- username charset, deduplicated with a numeric suffix on collision.
WITH ranked AS (
  SELECT
    id,
    COALESCE(
      NULLIF(regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9_.-]', '', 'g'), ''),
      'user'
    ) AS base,
    row_number() OVER (
      PARTITION BY COALESCE(
        NULLIF(regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9_.-]', '', 'g'), ''),
        'user'
      )
      ORDER BY "createdAt"
    ) AS rn
  FROM "User"
)
UPDATE "User" u
SET "username" = CASE WHEN r.rn = 1 THEN r.base ELSE r.base || r.rn::text END
FROM ranked r
WHERE u.id = r.id;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
