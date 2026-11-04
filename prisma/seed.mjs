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

    // This seed runs on EVERY container start, so anything it writes to an
    // existing row it writes again after every update and restart. It used to
    // UPDATE icon, mediaType and "order" here — all three are editable in the
    // app, so a collection dragged to the top was back at the bottom after the
    // next restart, and a changed icon was back to the default. The user
    // reported exactly that on 04.11.2026 for "PC-Spiele".
    //
    // The seed's job is to make sure the defaults EXIST, not to assert what
    // they should look like. An existing collection is therefore left alone.
    let created = 0;
    let vorhanden = 0;
    for (const col of DEFAULT_COLLECTIONS) {
      const existing = await client.query(`SELECT id FROM "Collection" WHERE name=$1 LIMIT 1`, [col.name]);
      if (existing.rows.length > 0) {
        vorhanden++;
      } else if (ownerId) {
        // Appended rather than placed at the index from the JSON: on a fresh
        // database that yields exactly the file's order (0, 1, 2 …), and on an
        // existing one a newly shipped default lands at the end instead of
        // colliding with an arrangement somebody made.
        const max = await client.query(`SELECT COALESCE(MAX("order"), -1) AS m FROM "Collection"`);
        await client.query(
          `INSERT INTO "Collection" (id, name, icon, "mediaType", "order", "gradingEnabled", "userId", "createdAt")
           VALUES ($1,$2,$3,$4::\"MediaType\",$5,false,$6,NOW())`,
          [cuid(), col.name, col.icon, col.mediaType, Number(max.rows[0].m) + 1, ownerId],
        );
        created++;
      }
    }

    if (ownerId) {
      console.log(`✓ collections: ${created} created, ${vorhanden} already there (left untouched)`);
    } else {
      // First boot: nobody exists yet, so the setup page creates them for
      // the first admin instead.
      console.log(`✓ collections: ${vorhanden} already there, rest left to first-run setup`);
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
        // "order" is NOT reasserted — the groups can be dragged into order in
        // the app, and writing it here put them back on every restart.
        // linkedField stays, because that is wiring and not a preference: it
        // is what makes "Shops" point at Item.store, and the app validates it
        // against the same allow-list (src/lib/tags/linkedField.ts).
        await client.query(
          `UPDATE "TagGroup" SET "linkedField"=$1 WHERE id=$2`,
          [groupDef.linkedField ?? null, groupId]
        );
      } else {
        groupId = cuid();
        const max = await client.query(`SELECT COALESCE(MAX("order"), -1) AS m FROM "TagGroup" WHERE "isSystem"=true AND "userId" IS NULL`);
        await client.query(
          `INSERT INTO "TagGroup" (id, name, "order", color, "isSystem", "linkedField", "createdAt")
           VALUES ($1,$2,$3,'#ff2d95',true,$4,NOW())`,
          [groupId, groupDef.name, Number(max.rows[0].m) + 1, groupDef.linkedField ?? null]
        );
      }

      // Upsert values
      for (let i = 0; i < groupDef.values.length; i++) {
        const existingVal = await client.query(
          `SELECT id FROM "TagValue" WHERE "groupId"=$1 AND value=$2 LIMIT 1`,
          [groupId, groupDef.values[i]]
        );
        if (existingVal.rows.length > 0) {
          // Left alone: the values inside a group are draggable too, and
          // rewriting "order" here undid that on every restart.
          continue;
        }
        const max = await client.query(
          `SELECT COALESCE(MAX("order"), -1) AS m FROM "TagValue" WHERE "groupId"=$1`,
          [groupId]
        );
        await client.query(
          `INSERT INTO "TagValue" (id, "groupId", value, "order", "createdAt") VALUES ($1,$2,$3,$4,NOW())`,
          [cuid(), groupId, groupDef.values[i], Number(max.rows[0].m) + 1]
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

    console.log(`✓ No default user created — first login will prompt account setup`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
