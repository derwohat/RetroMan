import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { getUserId } from "@/lib/api/auth";

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
  // The random file name was the only thing standing between these images and
  // anyone who asked for them. A name is not a permission.
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { filename } = await params;

  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const contentType = MIME[ext] ?? "application/octet-stream";

  // Reading straight away instead of asking existsSync first: between the two
  // the file can disappear, and that race answered with a 500 instead of a 404.
  try {
    const file = await readFile(join(UPLOAD_DIR, filename));
    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        // "private", not "public": the response now depends on who is asking,
        // and a shared cache must not hand one person's image to the next
        // requester.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error("Bilddatei konnte nicht gelesen werden:", err);
    }
    return new NextResponse("Not found", { status: 404 });
  }
}
