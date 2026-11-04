import { NextResponse } from "next/server";
import type { RenameValueResult } from "@/lib/tags/linkedField";

/**
 * Turns the result of renameOrMergeValue into an answer.
 *
 * Both routes that rename a list value — the admin one and the user's own —
 * answer identically, so the mapping lives here rather than twice. 409 for
 * "needs-confirm" because the request is well-formed and conflicts with what
 * is stored; the answer carries the number the question needs, so the browser
 * does not have to count anything itself.
 */
export function renameAnswer(result: RenameValueResult): NextResponse {
  if (result.kind === "not-found") {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  if (result.kind === "needs-confirm") {
    return NextResponse.json(
      {
        error: "Dieser Wert existiert bereits.",
        mergeRequired: true,
        affectedItems: result.affectedItems,
        from: result.from,
        into: result.into,
      },
      { status: 409 },
    );
  }
  return NextResponse.json({
    id: result.id,
    value: result.value,
    updatedItems: result.updatedItems,
    merged: result.kind === "merged",
  });
}
