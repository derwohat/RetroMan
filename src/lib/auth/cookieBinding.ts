/**
 * Is the session cookie bound to HTTPS?
 *
 * Codebook docs/security.md: the binding follows the **actual connection**,
 * not a setting. Auth.js on its own derives it from the scheme of the
 * configured address (`AUTH_URL`/`NEXTAUTH_URL`) — the one source that
 * section rules out, because it knows only one of the two ways in and shuts
 * the other one down. With `https://` configured and the plain port open
 * beside the proxy, a sign-in there produces a cookie the browser itself
 * discards: correct credentials, HTTP 200, and back on the sign-in page with
 * nothing logged.
 *
 * Two things measured on this Next version, both of which decide the order
 * below:
 *
 * - **Next fills in `x-forwarded-proto` itself** (`http`) when no proxy sent
 *   one. A missing header is therefore indistinguishable from a proxy that
 *   announces plain HTTP, so "header absent" cannot be used as a signal.
 * - **`req.url` is built from that same header**, not from the socket, so it
 *   is not an independent second opinion.
 *
 * That leaves the hostname. A request arriving under the configured public
 * name on its default port came through the proxy that owns that name,
 * whether or not the proxy announces the scheme — so it is judged first.
 * Without that, a proxy that omits the header would downgrade every session
 * to an unbound cookie and sign everyone out, silently and on upgrade.
 */

/** `AUTH_URL`/`NEXTAUTH_URL` as a URL, or null if unset or unparsable. */
function configuredUrl(): URL | null {
  const raw = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/** Default port for a scheme, since a URL leaves it empty. */
function portOf(url: URL): string {
  return url.port || (url.protocol === "https:" ? "443" : "80");
}

/**
 * Host headers carry an explicit port, the configured address usually does
 * not. The port has to be compared, not dropped: reaching the same name on
 * the app's own port is the plain way in, not the proxied one.
 */
function isConfiguredHost(hostHeader: string, configured: URL): boolean {
  const [name, port] = hostHeader.trim().toLowerCase().split(":");
  if (name !== configured.hostname.toLowerCase()) return false;
  return (port || (configured.protocol === "https:" ? "443" : "80")) === portOf(configured);
}

/**
 * The header is forgeable while the app port is reachable directly, and for
 * this decision that is harmless: whoever claims `https` over an HTTP
 * connection gets a cookie their own browser throws away and locks out only
 * themselves. The same goes for claiming the public hostname. It does not
 * carry over to decisions whose forgery harms a third party — a link mailed
 * to someone else belongs on a configured address.
 */
export function isSecureConnection(
  forwardedProto: string | null,
  forwardedHost: string | null,
  hostHeader: string | null,
): boolean {
  const configured = configuredUrl();
  const configuredIsHttps = configured?.protocol === "https:";

  if (configuredIsHttps && configured) {
    // X-Forwarded-Host first: a proxy that rewrites `Host` to its target
    // still names the original there.
    const claimed = forwardedHost?.split(",")[0]?.trim() || hostHeader;
    if (claimed && isConfiguredHost(claimed, configured)) return true;
  }

  // A proxy chain appends, so the client's own scheme is the first entry.
  const proto = forwardedProto?.split(",")[0]?.trim().toLowerCase();
  if (proto === "https" || proto === "http") return proto === "https";

  return configuredIsHttps;
}
