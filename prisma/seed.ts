import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const DEFAULT_COLLECTIONS = [
  { name: "Konsolenspiele", icon: "gamepad",  mediaType: "GAME",    order: 0 },
  { name: "Schallplatten",  icon: "vinyl",    mediaType: "MUSIC",   order: 1 },
  { name: "CDs",            icon: "cd",       mediaType: "MUSIC",   order: 2 },
  { name: "Kassetten",      icon: "cassette", mediaType: "MUSIC",   order: 3 },
  { name: "VHS",            icon: "vhs",      mediaType: "FILM",    order: 4 },
  { name: "DVD",            icon: "dvd",      mediaType: "FILM",    order: 5 },
  { name: "Blu-ray",        icon: "bluray",   mediaType: "FILM",    order: 6 },
  { name: "Bücher",         icon: "book",     mediaType: "BOOK",    order: 7 },
  { name: "Comics",         icon: "comic",    mediaType: "COMIC",   order: 8 },
  { name: "Konsolen",       icon: "console",  mediaType: "CONSOLE", order: 9 },
  { name: "PC-Spiele",      icon: "computer", mediaType: "GAME",    order: 10 },
];

const DEFAULT_TAG_GROUPS = [
  {
    name: "Grading Service",
    order: 0,
    isSystem: true,
    values: ["PSA", "CGC", "WATA", "BGS", "VGA", "SGC", "AFA", "HGA"],
  },
  {
    name: "Shops",
    order: 1,
    isSystem: true,
    values: [
      "eBay", "Amazon", "MediaMarkt", "Saturn", "GameStop",
      "Thalia", "Weltbild", "Otto", "Rebuy", "Momox", "Kleinanzeigen",
      "Flohmarkt", "Privat",
    ],
  },
  {
    name: "Lagerort",
    order: 2,
    isSystem: true,
    values: [],
  },
];

async function main() {
  // ── Upsert default collections ────────────────────────────────────────────────
  for (const col of DEFAULT_COLLECTIONS) {
    const existing = await prisma.collection.findFirst({ where: { name: col.name } });
    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await prisma.collection.update({ where: { id: existing.id }, data: { icon: col.icon, order: col.order, mediaType: col.mediaType as any } });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await prisma.collection.create({ data: col as any });
    }
  }
  console.log(`✓ ${DEFAULT_COLLECTIONS.length} collections synced`);

  // ── Upsert default tag groups ─────────────────────────────────────────────────
  for (const groupDef of DEFAULT_TAG_GROUPS) {
    const group = await prisma.tagGroup.upsert({
      where: { name: groupDef.name },
      create: { name: groupDef.name, order: groupDef.order, isSystem: groupDef.isSystem },
      update: { order: groupDef.order, isSystem: groupDef.isSystem },
    });
    for (let i = 0; i < groupDef.values.length; i++) {
      await prisma.tagValue.upsert({
        where: { groupId_value: { groupId: group.id, value: groupDef.values[i] } },
        create: { groupId: group.id, value: groupDef.values[i], order: i },
        update: { order: i },
      });
    }
    console.log(`✓ Tag group "${group.name}" synced (${groupDef.values.length} values)`);
  }

  // ── Ensure singleton AppSettings exists ──────────────────────────────────────
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
  console.log(`✓ AppSettings singleton ensured`);

  console.log(`✓ No default user created — first login will prompt account setup`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
