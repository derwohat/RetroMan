-- Add FILM and SERIE to MediaType enum
ALTER TYPE "MediaType" ADD VALUE 'FILM';
ALTER TYPE "MediaType" ADD VALUE 'SERIE';

-- Migrate existing VIDEO collections to FILM
UPDATE "Collection" SET "mediaType" = 'FILM' WHERE "mediaType" = 'VIDEO';
