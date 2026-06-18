import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

const execAsync = promisify(exec);

// In the Docker container, prisma lives in /migrate; in dev it's in the project root
const MIGRATE_DIR = existsSync("/migrate/node_modules/prisma") ? "/migrate" : null;
const MIGRATE_CMD = MIGRATE_DIR
  ? `node ${MIGRATE_DIR}/node_modules/prisma/build/index.js migrate deploy`
  : "npx prisma migrate deploy";
const SEED_CMD = existsSync("/app/prisma/seed.mjs")
  ? "node /app/prisma/seed.mjs"
  : "dotenv -e .env -- npx tsx prisma/seed.ts";

async function checkAdmin(): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== "production") return null;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export async function GET() {
  const denied = await checkAdmin();
  if (denied) return denied;

  try {
    // Query applied migrations from _prisma_migrations table
    const rows = await prisma.$queryRaw<Array<{
      migration_name: string;
      finished_at: Date | null;
      rolled_back_at: Date | null;
      started_at: Date;
    }>>`SELECT migration_name, finished_at, rolled_back_at, started_at
        FROM _prisma_migrations
        ORDER BY started_at DESC
        LIMIT 20`;

    const failed = rows.filter((r) => r.finished_at === null || r.rolled_back_at !== null);
    const applied = rows.filter((r) => r.finished_at !== null && r.rolled_back_at === null);
    const last = applied[0] ?? null;

    return NextResponse.json({
      applied: applied.length,
      failed: failed.length,
      lastMigration: last?.migration_name ?? null,
      lastApplied: last?.finished_at ?? null,
      hasFailed: failed.length > 0,
    });
  } catch {
    return NextResponse.json({ applied: 0, failed: 0, lastMigration: null, lastApplied: null, hasFailed: false });
  }
}

export async function POST() {
  const denied = await checkAdmin();
  if (denied) return denied;

  const lines: string[] = [];

  try {
    // 1. Run migrations
    lines.push("▶ Führe Datenbank-Migrationen aus…");
    const { stdout: migrateOut, stderr: migrateErr } = await execAsync(
      MIGRATE_CMD,
      { cwd: MIGRATE_DIR ?? process.cwd(), timeout: 60000 },
    );
    const migrateLog = (migrateOut + migrateErr)
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("Loaded Prisma") && !l.startsWith("Prisma schema") && !l.startsWith("Datasource"));
    lines.push(...migrateLog);

    // 2. Run seed
    lines.push("▶ Führe Seed aus…");
    const { stdout: seedOut, stderr: seedErr } = await execAsync(
      SEED_CMD,
      { cwd: process.cwd(), timeout: 60000 },
    );
    const seedLog = (seedOut + seedErr).split("\n").map((l) => l.trim()).filter(Boolean);
    lines.push(...seedLog);

    lines.push("✓ Migration abgeschlossen.");
    return NextResponse.json({ success: true, output: lines });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    lines.push(`✗ Fehler: ${msg}`);
    return NextResponse.json({ success: false, output: lines }, { status: 500 });
  }
}
