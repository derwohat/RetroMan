"use client";

import { useEffect } from "react";

/**
 * Codebook docs/user-management.md, "Abgelaufene Sitzung führt sofort zur
 * Anmeldung".
 *
 * Since the two session deadlines went in, a session can end while a page is
 * open. The middleware guards page loads, not the `fetch` calls a loaded page
 * makes — so the first thing that happened afterwards was nothing: the request
 * came back 401, the view showed its own error, and the page looked broken
 * rather than signed out.
 *
 * The standard asks for one place every request passes. RetroMan has 113 fetch
 * call sites across 23 files and no API wrapper to put it in, so the wrapper is
 * installed around `fetch` itself, once, here. That also covers the paths a
 * refactor would miss — uploads, downloads and anything added later.
 */

/** Only a path on this site, and never a protocol-relative one. */
export function safeReturnTarget(raw: string | null): string {
  if (!raw) return "/";
  // `//other.example` and `/\other.example` are read as a foreign host.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}

function isSessionCall(url: string): boolean {
  // next-auth answers its own endpoints with 200 and an error code, never a
  // 401 that means "expired" — and signing in must not bounce to itself.
  return url.includes("/api/auth/");
}

export function SessionExpiryGuard() {
  useEffect(() => {
    const original = window.fetch;
    // One flag for the whole page: a dashboard fires several requests at once,
    // and all of them fail together. Five navigations would fight each other.
    let redirecting = false;

    window.fetch = async function patched(input, init) {
      const response = await original(input, init);
      if (response.status !== 401 || redirecting) return response;

      const url =
        typeof input === "string" ? input
        : input instanceof URL ? input.href
        : input instanceof Request ? input.url
        : "";

      let path: string;
      try {
        path = new URL(url, window.location.origin).pathname;
      } catch {
        return response;
      }
      if (!path.startsWith("/api/") || isSessionCall(path)) return response;

      redirecting = true;
      const back = window.location.pathname + window.location.search;
      const query = new URLSearchParams({ abgelaufen: "1", redirect: safeReturnTarget(back) });
      // replace, not assign: the expired page should not come back with Back.
      window.location.replace(`/login?${query.toString()}`);
      return response;
    };

    return () => {
      window.fetch = original;
    };
  }, []);

  return null;
}
