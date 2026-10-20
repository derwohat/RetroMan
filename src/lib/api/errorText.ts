/**
 * The server's own words, whatever shape the answer has.
 *
 * Codebook docs/product-standards.md: where the server refuses, its text is
 * shown verbatim rather than replaced by a general phrase. Three cases have
 * to survive that — a JSON body with `error`, a plain-text body, and an empty
 * one, which is what an unhandled exception produces. The old call sites
 * assumed JSON and called `alert(data.error)`, so an empty 500 threw inside
 * the error handler itself.
 */
export async function errorText(res: Response, fallback = "Fehler"): Promise<string> {
  let body = "";
  try {
    body = await res.text();
  } catch {
    // A body that cannot be read is no reason to lose the status code.
  }

  if (body) {
    try {
      const parsed: unknown = JSON.parse(body);
      if (parsed && typeof parsed === "object" && "error" in parsed) {
        const value = (parsed as { error: unknown }).error;
        if (typeof value === "string" && value.length > 0) return value;
      }
    } catch {
      // Not JSON — then the text itself is the message.
    }
    return body.slice(0, 500);
  }

  return `${fallback} (HTTP ${res.status})`;
}
