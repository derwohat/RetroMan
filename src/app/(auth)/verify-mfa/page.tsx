"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function VerifyMfaPage() {
  const { update } = useSession();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError((d as { error?: string }).error ?? "Ungültiger Code.");
      setLoading(false);
      return;
    }

    // Clear mfaPending in the JWT so the user gets full access
    await update({ mfaPending: false });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background grid-bg px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-full h-48">
            <Image src="/logo.png" alt="RetroMan" fill className="object-contain" priority />
          </div>
          <p className="slogan-glow text-sm tracking-widest italic">Rewind your world!</p>
          <p className="text-muted-foreground text-xs text-center">
            Gib den 6-stelligen Code aus deiner Authenticator-App ein.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="token" className="text-xs text-muted-foreground uppercase tracking-wider">
              Authenticator-Code
            </label>
            <input
              id="token"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              autoComplete="one-time-code"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
              className="retro-field w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground font-mono text-center tracking-[0.5em] placeholder:text-muted-foreground placeholder:tracking-normal focus:outline-none"
              placeholder="123456"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading || token.length !== 6}
            className="w-full rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider transition hover:opacity-90 disabled:opacity-50 neon-border"
          >
            {loading ? "Prüfe…" : "Bestätigen"}
          </button>
        </form>
      </div>
    </div>
  );
}
