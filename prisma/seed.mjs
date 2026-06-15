// Pure Node.js ESM seed — no TypeScript required, runs with `node prisma/seed.mjs`
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

const DEFAULT_CATEGORIES = [
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
  { name: "Lagerort", order: 1, values: [] },
];

async function main() {
  // Migrate renamed categories
  for (const [from, to, icon] of [
    ["VHS/DVD/Bluray", "VHS", "vhs"],
    ["Bücher/Comics", "Bücher", "book"],
  ]) {
    const r = await prisma.category.updateMany({ where: { name: from }, data: { name: to, icon } });
    if (r.count > 0) console.log(`✓ Migrated "${from}" → "${to}"`);
  }

  // Upsert categories
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: cat.name },
      create: cat,
      update: { icon: cat.icon, order: cat.order },
    });
  }
  console.log(`✓ ${DEFAULT_CATEGORIES.length} categories synced`);

  // Ensure each category has a default collection
  const allCategories = await prisma.category.findMany({ orderBy: { order: "asc" } });
  for (const cat of allCategories) {
    const existing = await prisma.collection.findFirst({ where: { categoryId: cat.id } });
    if (!existing) {
      await prisma.collection.create({
        data: { id: cat.id, name: cat.name, categoryId: cat.id, order: cat.order },
      });
      console.log(`✓ Created default collection "${cat.name}"`);
    }
  }

  // Upsert tag groups
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
    console.log(`✓ Tag group "${group.name}" synced`);
  }

  // AppSettings singleton
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
  console.log(`✓ AppSettings singleton ensured`);

  // Admin user (first time only)
  const existing = await prisma.user.findFirst({ where: { email: "admin@retroman.local" } });
  if (!existing) {
    const passwordHash = await bcrypt.hash("admin1234", 12);
    await prisma.user.create({
      data: {
        email: "admin@retroman.local",
        name: "Admin",
        passwordHash,
        role: "ADMIN",
        mustChangePassword: true,
      },
    });
    console.log(`✓ Admin user created: admin@retroman.local`);
    console.log(`  Temporary password: admin1234  (must be changed on first login)`);
  } else {
    console.log(`✓ Admin user exists: ${existing.email}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
