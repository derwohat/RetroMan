// Production seed — uses pg directly to avoid Prisma TypeScript client at runtime.
import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

function cuid() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `c${ts}${rand}`;
}

async function main() {
  const client = await pool.connect();
  try {
    // Migrate renamed categories
    for (const [from, to, icon] of [
      ["VHS/DVD/Bluray", "VHS", "vhs"],
      ["Bücher/Comics", "Bücher", "book"],
    ]) {
      const r = await client.query(
        `UPDATE "Category" SET name=$1, icon=$2 WHERE name=$3`,
        [to, icon, from]
      );
      if (r.rowCount > 0) console.log(`✓ Migrated "${from}" → "${to}"`);
    }

    // Upsert categories
    for (const cat of DEFAULT_CATEGORIES) {
      await client.query(
        `INSERT INTO "Category" (id, name, icon, "mediaType", "order")
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (name) DO UPDATE SET icon=EXCLUDED.icon, "order"=EXCLUDED."order"`,
        [cuid(), cat.name, cat.icon, cat.mediaType, cat.order]
      );
    }
    console.log(`✓ ${DEFAULT_CATEGORIES.length} categories synced`);

    // Ensure each category has a default collection
    const { rows: cats } = await client.query(`SELECT id, name, "order" FROM "Category" ORDER BY "order"`);
    for (const cat of cats) {
      const { rows } = await client.query(
        `SELECT id FROM "Collection" WHERE "categoryId"=$1 LIMIT 1`,
        [cat.id]
      );
      if (rows.length === 0) {
        await client.query(
          `INSERT INTO "Collection" (id, name, "categoryId", "order") VALUES ($1,$2,$3,$4)`,
          [cat.id, cat.name, cat.id, cat.order]
        );
        console.log(`✓ Created default collection "${cat.name}"`);
      }
    }

    // Upsert tag groups and values
    for (const groupDef of DEFAULT_TAG_GROUPS) {
      const { rows: existing } = await client.query(
        `SELECT id FROM "TagGroup" WHERE name=$1`,
        [groupDef.name]
      );
      let groupId;
      if (existing.length > 0) {
        groupId = existing[0].id;
        await client.query(`UPDATE "TagGroup" SET "order"=$1 WHERE id=$2`, [groupDef.order, groupId]);
      } else {
        groupId = cuid();
        await client.query(
          `INSERT INTO "TagGroup" (id, name, "order") VALUES ($1,$2,$3)`,
          [groupId, groupDef.name, groupDef.order]
        );
      }
      for (let i = 0; i < groupDef.values.length; i++) {
        await client.query(
          `INSERT INTO "TagValue" (id, "groupId", value, "order")
           VALUES ($1,$2,$3,$4)
           ON CONFLICT ("groupId", value) DO UPDATE SET "order"=EXCLUDED."order"`,
          [cuid(), groupId, groupDef.values[i], i]
        );
      }
      console.log(`✓ Tag group "${groupDef.name}" synced`);
    }

    // AppSettings singleton
    await client.query(
      `INSERT INTO "AppSettings" (id) VALUES ('singleton') ON CONFLICT (id) DO NOTHING`
    );
    console.log(`✓ AppSettings singleton ensured`);

    // Admin user (first time only)
    const { rows: users } = await client.query(
      `SELECT email FROM "User" WHERE email='admin@retroman.local' LIMIT 1`
    );
    if (users.length === 0) {
      const passwordHash = await bcrypt.hash("admin1234", 12);
      await client.query(
        `INSERT INTO "User" (id, email, name, "passwordHash", role, "mustChangePassword")
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [cuid(), "admin@retroman.local", "Admin", passwordHash, "ADMIN", true]
      );
      console.log(`✓ Admin user created: admin@retroman.local`);
      console.log(`  Temporary password: admin1234  (must be changed on first login)`);
    } else {
      console.log(`✓ Admin user exists: ${users[0].email}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
