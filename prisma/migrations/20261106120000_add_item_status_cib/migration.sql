-- CIB (complete in box): an opened item that is complete with box and manual.
-- Placed after OPENED so the database order matches the order in the app.
-- Additive only: no existing row changes.
ALTER TYPE "ItemStatus" ADD VALUE IF NOT EXISTS 'CIB' AFTER 'OPENED';
