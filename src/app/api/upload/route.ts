import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { existsSync } from "fs";
import { getUserId } from "@/lib/api/auth";

const UPLOAD_DIR =
  process.env.NODE_ENV === "production"
    ? "/app/uploads"
    : join(process.cwd(), "public", "uploads");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * A second lock behind the one in proxy.ts. This route writes attacker-supplied
 * bytes to disk, so it does not rely on a path list in another file staying
 * correct - that list is exactly what was wrong.
 */
async function denyAnonymous(): Promise<NextResponse | null> {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export async function POST(req: NextRequest) {
  const denied = await denyAnonymous();
  if (denied) return denied;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Nur JPEG, PNG, WebP, GIF erlaubt." }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "Datei zu groß (max. 10 MB)." }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${randomBytes(12).toString("hex")}.${ext}`;
  const bytes = await file.arrayBuffer();

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(join(UPLOAD_DIR, filename), Buffer.from(bytes));
  } catch (err) {
    // Unguarded, this answered with a bare 500 and an empty body, which the
    // form then showed as nothing at all. The usual cause is a bind-mounted
    // uploads directory owned by someone else: readable, not writable.
    console.error("Upload konnte nicht geschrieben werden:", err);
    const code = (err as NodeJS.ErrnoException).code;
    const message =
      code === "EACCES" || code === "EPERM"
        ? "Das Bildverzeichnis ist für den Dienst nicht beschreibbar. Der Grund steht im Serverprotokoll."
        : "Das Bild konnte nicht gespeichert werden.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ url: `/api/uploads/${filename}` });
}

export async function DELETE(req: NextRequest) {
  const denied = await denyAnonymous();
  if (denied) return denied;

  const { url } = await req.json() as { url?: string };
  if (!url) return NextResponse.json({ success: false });

  const filename = url.split("/").pop();
  if (!filename || filename.includes("..")) return NextResponse.json({ success: false });

  const filePath = join(UPLOAD_DIR, filename);
  if (existsSync(filePath)) {
    // Swallowing this left no trace of a directory the service cannot write to.
    await unlink(filePath).catch((err) => {
      console.error("Alte Bilddatei konnte nicht gelöscht werden:", err);
    });
  }
  return NextResponse.json({ success: true });
}
