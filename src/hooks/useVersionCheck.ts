"use client";

import { useState, useEffect, useRef } from "react";

const BUILD_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function useVersionCheck(): {
  updateAvailable: boolean;
  latestVersion: string;
  dismiss: () => void;
} {
  const [latestVersion, setLatestVersion] = useState(BUILD_VERSION);
  const [dismissed, setDismissed] = useState(false);
  const inFlight = useRef(false);

  async function check() {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch("/api/changelog", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const live: string = data.currentVersion ?? BUILD_VERSION;
      setLatestVersion(live);
      // Reset dismiss on every check so a persistent mismatch reappears
      if (live !== BUILD_VERSION) setDismissed(false);
    } catch {
      // network errors are silently swallowed — banner simply stays hidden
    } finally {
      inFlight.current = false;
    }
  }

  useEffect(() => {
    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onFocus = () => check();
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return {
    updateAvailable: !dismissed && latestVersion !== BUILD_VERSION,
    latestVersion,
    dismiss: () => setDismissed(true),
  };
}
