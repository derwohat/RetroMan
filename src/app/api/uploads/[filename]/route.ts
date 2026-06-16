import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const UPLOAD_DIR =
  process.env.NODE_ENV === "production"
    ? "/app/uploads"
    : join(process.cwd(), "public", "uploads");

const MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg",
  png: "image/png", webp: "image/webp", gif: "image/gif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = join(UPLOAD_DIR, filename);
  if (!existsSync(filePath)) return new NextResponse("Not found", { status: 404 });

  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const contentType = MIME[ext] ?? "application/octet-stream";

  const file = await readFile(filePath);
  return new NextResponse(file, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
