"use client";

import { useEffect } from "react";

export function FontSizeProvider() {
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : { fontSize: "medium" }))
      .then((data: { fontSize?: string }) => {
        const size = data.fontSize || "medium";
        document.documentElement.classList.remove(
          "font-size-small",
          "font-size-medium",
          "font-size-large",
        );
        document.documentElement.classList.add(`font-size-${size}`);
      })
      .catch(() => {});
  }, []);

  return null;
}
