import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { existsSync } from "fs";

const UPLOAD_DIR =
  process.env.NODE_ENV === "production"
    ? "/app/uploads"
    : join(process.cwd(), "public", "uploads");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Nur JPEG, PNG, WebP, GIF erlaubt." }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "Datei zu groß (max. 10 MB)." }, { status: 400 });

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${randomBytes(12).toString("hex")}.${ext}`;
  const bytes = await file.arrayBuffer();
  await writeFile(join(UPLOAD_DIR, filename), Buffer.from(bytes));

  return NextResponse.json({ url: `/api/uploads/${filename}` });
}

export async function DELETE(req: NextRequest) {
  const { url } = await req.json() as { url?: string };
  if (!url) return NextResponse.json({ success: false });

  const filename = url.split("/").pop();
  if (!filename || filename.includes("..")) return NextResponse.json({ success: false });

  const filePath = join(UPLOAD_DIR, filename);
  if (existsSync(filePath)) {
    await unlink(filePath).catch(() => {});
  }
  return NextResponse.json({ success: true });
}
