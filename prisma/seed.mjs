// Production seed — uses pg directly (no TypeScript/Prisma client needed at runtime).
import pg from "pg";
import { randomBytes } from "node:crypto";

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
    linkedField: "store",
    values: [
      "eBay", "Amazon", "MediaMarkt", "Saturn", "GameStop",
      "Thalia", "Weltbild", "Otto", "Rebuy", "Momox", "Kleinanzeigen",
      "Flohmarkt", "Privat",
    ],
  },
  { name: "Lagerort", order: 2, isSystem: true, linkedField: "location", values: [] },
];

function cuid() {
  const ts = Date.now().toString(36);
  const rand = randomBytes(4).toString("hex");
  return `c${ts}${rand}`;
}


async function main() {
  const client = await pool.connect();
  try {
    // ── Upsert Collections ────────────────────────────────────────────────────
    for (const col of DEFAULT_COLLECTIONS) {
      const existing = await client.query(`SELECT id FROM "Collection" WHERE name=$1 LIMIT 1`, [col.name]);
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE "Collection" SET icon=$1, "mediaType"=$2::\"MediaType\", "order"=$3 WHERE id=$4`,
          [col.icon, col.mediaType, col.order, existing.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO "Collection" (id, name, icon, "mediaType", "order", "gradingEnabled", "createdAt")
           VALUES ($1,$2,$3,$4::\"MediaType\",$5,false,NOW())`,
          [cuid(), col.name, col.icon, col.mediaType, col.order]
        );
      }
    }
    console.log(`✓ ${DEFAULT_COLLECTIONS.length} collections synced`);

    // ── Upsert Tag Groups ─────────────────────────────────────────────────────
    for (const groupDef of DEFAULT_TAG_GROUPS) {
      // System tag groups have no userId — match on name + isSystem + userId IS NULL
      const existing = await client.query(
        `SELECT id FROM "TagGroup" WHERE name=$1 AND "isSystem"=true AND "userId" IS NULL LIMIT 1`,
        [groupDef.name]
      );
      let groupId;
      if (existing.rows.length > 0) {
        groupId = existing.rows[0].id;
        await client.query(
          `UPDATE "TagGroup" SET "order"=$1, "linkedField"=$2 WHERE id=$3`,
          [groupDef.order, groupDef.linkedField ?? null, groupId]
        );
      } else {
        groupId = cuid();
        await client.query(
          `INSERT INTO "TagGroup" (id, name, "order", color, "isSystem", "linkedField", "createdAt")
           VALUES ($1,$2,$3,'#ff2d95',true,$4,NOW())`,
          [groupId, groupDef.name, groupDef.order, groupDef.linkedField ?? null]
        );
      }

      // Upsert values
      for (let i = 0; i < groupDef.values.length; i++) {
        const existingVal = await client.query(
          `SELECT id FROM "TagValue" WHERE "groupId"=$1 AND value=$2 LIMIT 1`,
          [groupId, groupDef.values[i]]
        );
        if (existingVal.rows.length > 0) {
          await client.query(`UPDATE "TagValue" SET "order"=$1 WHERE id=$2`, [i, existingVal.rows[0].id]);
        } else {
          await client.query(
            `INSERT INTO "TagValue" (id, "groupId", value, "order", "createdAt") VALUES ($1,$2,$3,$4,NOW())`,
            [cuid(), groupId, groupDef.values[i], i]
          );
        }
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

    console.log(`✓ No default user created — first login will prompt account setup`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
