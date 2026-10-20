"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/components/LanguageProvider";
import type { ImpactState } from "@/components/ui/DangerZone";

interface ImpactTarget {
  type: string;
  id: string;
  subId?: string | null;
}

/**
 * Fetches the counted consequences when a danger-zone dialog opens — not
 * before, so a long list does not fire one request per row.
 *
 * Returns the three states the Codebook asks for. A failed request becomes
 * "unavailable" rather than staying on "loading": a dialog that counts
 * forever looks like one that found nothing.
 */
export function useDeleteImpact(target: ImpactTarget | null): ImpactState {
  const { t } = useTranslations();
  const [impact, setImpact] = useState<ImpactState>({ state: "none" });

  const type = target?.type ?? null;
  const id = target?.id ?? null;
  const subId = target?.subId ?? null;

  useEffect(() => {
    if (!type || !id) {
      setImpact({ state: "none" });
      return;
    }

    let cancelled = false;
    setImpact({ state: "loading" });

    const query = new URLSearchParams({ type, id });
    if (subId) query.set("subId", subId);

    fetch(`/api/delete-impact?${query.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data: { counts?: { key: string; count: number }[] }) => {
        if (cancelled) return;
        const labels = t.common.impactLabels as Record<string, string[] | undefined>;
        const lines = (data.counts ?? []).map(({ key, count }) => {
          const forms = labels[key];
          // An unknown key still shows its number rather than vanishing —
          // a consequence silently dropped is the failure this prevents.
          const word = forms?.[count === 1 ? 0 : 1] ?? key;
          return `${count} ${word}`;
        });
        setImpact({ state: "ready", lines });
      })
      .catch(() => {
        if (!cancelled) setImpact({ state: "unavailable" });
      });

    return () => { cancelled = true; };
  }, [type, id, subId, t]);

  return impact;
}
