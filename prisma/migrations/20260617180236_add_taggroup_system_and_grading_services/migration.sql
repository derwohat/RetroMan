-- AlterTable
ALTER TABLE "TagGroup" ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- Shift existing groups to make room at position 0
UPDATE "TagGroup" SET "order" = "order" + 1;

-- Insert "Grading Service" system group at position 0
INSERT INTO "TagGroup" ("id", "name", "order", "color", "isSystem", "createdAt")
VALUES (
  'system_grading_service',
  'Grading Service',
  0,
  '#22c55e',
  true,
  NOW()
);

-- Insert grading service values
INSERT INTO "TagValue" ("id", "groupId", "value", "order", "createdAt")
VALUES
  ('gsv_psa',  'system_grading_service', 'PSA',   0, NOW()),
  ('gsv_cgc',  'system_grading_service', 'CGC',   1, NOW()),
  ('gsv_wata', 'system_grading_service', 'WATA',  2, NOW()),
  ('gsv_bgs',  'system_grading_service', 'BGS',   3, NOW()),
  ('gsv_vga',  'system_grading_service', 'VGA',   4, NOW()),
  ('gsv_sgc',  'system_grading_service', 'SGC',   5, NOW()),
  ('gsv_afa',  'system_grading_service', 'AFA',   6, NOW()),
  ('gsv_hga',  'system_grading_service', 'HGA',   7, NOW());
