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
  { name: "VHS",            icon: "vhs",      mediaType: "VIDEO",   order: 4 },
  { name: "DVD",            icon: "dvd",      mediaType: "VIDEO",   order: 5 },
  { name: "Blu-ray",        icon: "bluray",   mediaType: "VIDEO",   order: 6 },
  { name: "Bücher",         icon: "book",     mediaType: "BOOK",    order: 7 },
  { name: "Comics",         icon: "comic",    mediaType: "BOOK",    order: 8 },
  { name: "Konsolen",       icon: "console",  mediaType: "CONSOLE", order: 9 },
  { name: "PC-Spiele",      icon: "computer", mediaType: "GAME",    order: 10 },
];

const DEFAULT_TAG_GROUPS = [
  {
    name: "Shops",
    order: 0,
    values: [
      "eBay", "Amazon", "MediaMarkt", "Saturn", "GameStop",
      "Thalia", "Weltbild", "Otto", "Rebuy", "Momox", "Kleinanzeigen",
      "Flohmarkt", "Privat",
    ],
  },
  {
    name: "Lagerort",
    order: 1,
    values: [],
  },
];

async function main() {
  // ── Upsert default collections ────────────────────────────────────────────────
  for (const col of DEFAULT_COLLECTIONS) {
    const existing = await prisma.collection.findFirst({ where: { name: col.name } });
    if (existing) {
      await prisma.collection.update({ where: { id: existing.id }, data: { icon: col.icon, order: col.order } });
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
      create: { name: groupDef.name, order: groupDef.order },
      update: { order: groupDef.order },
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

  // ── First-time only: create admin user ───────────────────────────────────────
  const existing = await prisma.user.findFirst({ where: { email: "admin@retroman.local" } });
  if (!existing) {
    const passwordHash = await bcrypt.hash("admin1234", 12);
    const user = await prisma.user.create({
      data: {
        email: "admin@retroman.local",
        name: "Admin",
        passwordHash,
        role: "ADMIN",
        mustChangePassword: true,
      },
    });
    console.log(`✓ Admin user created: ${user.email}`);
    console.log(`  Temporary password: admin1234`);
    console.log(`  (Must be changed on first login)`);
  } else {
    console.log(`✓ Admin user exists: ${existing.email}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
