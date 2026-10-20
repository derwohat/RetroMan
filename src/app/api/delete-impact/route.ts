import { NextRequest, NextResponse } from "next/server";
import { deleteImpact } from "@/lib/deleteImpact";

/**
 * The counted consequences for a danger-zone dialog. One endpoint, but the
 * right demanded per type is the same one the deletion itself demands — see
 * the table in `@/lib/deleteImpact`.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = req.nextUrl.searchParams;
  const type = params.get("type") ?? "";
  const id = params.get("id") ?? "";
  const subId = params.get("subId");

  if (!type || !id) {
    return NextResponse.json({ error: "MissingParameters" }, { status: 400 });
  }

  const result = await deleteImpact(type, id, subId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ counts: result.counts });
}
