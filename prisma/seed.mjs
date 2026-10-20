// Production seed — uses pg directly (no TypeScript/Prisma client needed at runtime).
import pg from "pg";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Shared with src/app/api/setup/route.ts — one list, two readers.
const DEFAULT_COLLECTIONS = JSON.parse(
  readFileSync(new URL("./default-collections.json", import.meta.url), "utf8"),
);

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
    // ── Default collections ───────────────────────────────────────────────
    // They need an owner: Collection.userId is NOT NULL. Inserting without
    // one made every fresh installation die here with a 23502.
    const firstAdmin = await client.query(
      `SELECT id FROM "User" WHERE role='ADMIN' AND "deletedAt" IS NULL ORDER BY "createdAt" ASC LIMIT 1`,
    );
    const ownerId = firstAdmin.rows[0]?.id ?? null;

    let created = 0;
    let updated = 0;
    for (const col of DEFAULT_COLLECTIONS) {
      const existing = await client.query(`SELECT id FROM "Collection" WHERE name=$1 LIMIT 1`, [col.name]);
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE "Collection" SET icon=$1, "mediaType"=$2::\"MediaType\", "order"=$3 WHERE id=$4`,
          [col.icon, col.mediaType, col.order, existing.rows[0].id],
        );
        updated++;
      } else if (ownerId) {
        await client.query(
          `INSERT INTO "Collection" (id, name, icon, "mediaType", "order", "gradingEnabled", "userId", "createdAt")
           VALUES ($1,$2,$3,$4::\"MediaType\",$5,false,$6,NOW())`,
          [cuid(), col.name, col.icon, col.mediaType, col.order, ownerId],
        );
        created++;
      }
    }

    if (ownerId) {
      console.log(`✓ collections: ${created} created, ${updated} updated`);
    } else {
      // First boot: nobody exists yet, so the setup page creates them for
      // the first admin instead.
      console.log(`✓ collections: ${updated} updated, rest left to first-run setup`);
    }

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
