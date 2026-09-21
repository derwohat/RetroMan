"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useStandaloneTranslations } from "@/hooks/useStandaloneTranslations";

export function ForgotPasswordForm() {
  const { t, locale } = useStandaloneTranslations();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, locale }),
    });

    setLoading(false);

    if (res.status === 429) {
      setError(t.auth.resetRateLimited);
      return;
    }
    // Any other outcome shows the same confirmation — whether the address
    // exists must not be visible from the outside.
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background grid-bg px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-full h-48">
            <Image src="/logo.png" alt="RetroMan" fill className="object-contain" priority />
          </div>
          <p className="slogan-glow text-sm tracking-widest italic">{t.auth.slogan}</p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-xs text-foreground leading-relaxed">{t.auth.forgotSent}</p>
            <Link href="/login" className="auth-secondary-link inline-block text-xs">
              {t.auth.backToLogin}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-muted-foreground text-xs leading-relaxed">{t.auth.forgotIntro}</p>

            <div className="space-y-2">
              <label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wider">
                {t.auth.email}
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="retro-field w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none"
                placeholder={t.auth.emailPlaceholder}
              />
            </div>

            {error && <p className="text-xs text-destructive" role="alert">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? t.auth.forgotSending : t.auth.forgotSubmit}
            </button>

            <div className="text-center">
              <Link href="/login" className="auth-secondary-link text-xs">
                {t.auth.backToLogin}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
