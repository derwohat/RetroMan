// Production seed — uses pg directly (no TypeScript/Prisma client needed at runtime).
import pg from "pg";
import { createHash, randomBytes } from "node:crypto";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
  { name: "Lagerort", order: 2, isSystem: true, values: [] },
];

function cuid() {
  const ts = Date.now().toString(36);
  const rand = randomBytes(4).toString("hex");
  return `c${ts}${rand}`;
}

// bcrypt-compatible hash using node:crypto (10 rounds approximation via PBKDF2)
// In production the real bcrypt from bcryptjs is used — this is only for the default admin password.
async function hashPassword(password) {
  // Use a real bcrypt-like approach: we rely on the bcryptjs package being available
  try {
    const { default: bcrypt } = await import("bcryptjs");
    return bcrypt.hash(password, 12);
  } catch {
    // Fallback: SHA-256 with salt (not bcrypt-compatible, but prevents plaintext)
    const salt = randomBytes(16).toString("hex");
    const hash = createHash("sha256").update(salt + password).digest("hex");
    return `$sha256$${salt}$${hash}`;
  }
}

async function main() {
  const client = await pool.connect();
  try {
    // ── Upsert Collections ────────────────────────────────────────────────────
    for (const col of DEFAULT_COLLECTIONS) {
      await client.query(
        `INSERT INTO "Collection" (id, name, icon, "mediaType", "order", "gradingEnabled", "createdAt")
         VALUES ($1,$2,$3,$4::\"MediaType\",$5,false,NOW())
         ON CONFLICT (id) DO NOTHING`,
        [cuid(), col.name, col.icon, col.mediaType, col.order]
      );
      // Also update existing by name
      await client.query(
        `UPDATE "Collection" SET icon=$1, "mediaType"=$2::\"MediaType\", "order"=$3 WHERE name=$4`,
        [col.icon, col.mediaType, col.order, col.name]
      );
    }
    console.log(`✓ ${DEFAULT_COLLECTIONS.length} collections synced`);

    // ── Upsert Tag Groups ─────────────────────────────────────────────────────
    for (const groupDef of DEFAULT_TAG_GROUPS) {
      // Upsert group
      const res = await client.query(
        `INSERT INTO "TagGroup" (id, name, "order", color, "isSystem", "createdAt")
         VALUES ($1,$2,$3,'#ff2d95',$4,NOW())
         ON CONFLICT (name) DO UPDATE SET "order"=EXCLUDED."order", "isSystem"=EXCLUDED."isSystem"
         RETURNING id`,
        [cuid(), groupDef.name, groupDef.order, groupDef.isSystem]
      );
      const groupId = res.rows[0].id;

      // Upsert values
      for (let i = 0; i < groupDef.values.length; i++) {
        await client.query(
          `INSERT INTO "TagValue" (id, "groupId", value, "order", "createdAt")
           VALUES ($1,$2,$3,$4,NOW())
           ON CONFLICT ("groupId", value) DO UPDATE SET "order"=EXCLUDED."order"`,
          [cuid(), groupId, groupDef.values[i], i]
        );
      }
      console.log(`✓ Tag group "${groupDef.name}" synced (${groupDef.values.length} values)`);
    }

    // ── AppSettings singleton ─────────────────────────────────────────────────
    await client.query(
      `INSERT INTO "AppSettings" (id, "requireMfa", "fontSize", "interfaceLanguage", "updatedAt")
       VALUES ('singleton',false,'medium','de',NOW())
       ON CONFLICT (id) DO NOTHING`
    );
    console.log(`✓ AppSettings singleton ensured`);

    // ── Admin user (first time only) ──────────────────────────────────────────
    const existing = await client.query(
      `SELECT id FROM "User" WHERE email='admin@retroman.local' LIMIT 1`
    );
    if (existing.rows.length === 0) {
      const passwordHash = await hashPassword("admin1234");
      await client.query(
        `INSERT INTO "User" (id, email, name, "passwordHash", "mustChangePassword", "mfaEnabled",
           role, "preferredLanguage", "preferredRegion", "dateFormat", "createdAt", "updatedAt")
         VALUES ($1,'admin@retroman.local','Admin',$2,true,false,'ADMIN','de','PAL-EU','EUROPEAN',NOW(),NOW())`,
        [cuid(), passwordHash]
      );
      console.log(`✓ Admin user created: admin@retroman.local`);
      console.log(`  Temporary password: admin1234`);
      console.log(`  (Must be changed on first login)`);
    } else {
      console.log(`✓ Admin user exists: admin@retroman.local`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
