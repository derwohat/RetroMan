"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useStandaloneTranslations } from "@/hooks/useStandaloneTranslations";

export default function ChangePasswordPage() {
  const { update } = useSession();
  const { t } = useStandaloneTranslations();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(t.auth.passwordTooShort);
      return;
    }
    if (password !== confirm) {
      setError(t.auth.passwordsDoNotMatch);
      return;
    }

    setLoading(true);

    const res = await fetch("/api/user/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? t.auth.changePasswordError);
      return;
    }

    // Refresh JWT so middleware no longer redirects to this page
    await update({ mustChangePassword: false });
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background grid-bg px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-full h-48">
            <Image src="/logo.png" alt="RetroMan" fill className="object-contain" priority />
          </div>
          <p className="slogan-glow text-sm tracking-widest italic">{t.auth.slogan}</p>
          <p className="text-muted-foreground text-xs">
            {t.auth.changePasswordPrompt}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-xs text-muted-foreground uppercase tracking-wider">
              {t.auth.newPassword}
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="retro-field w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none"
              placeholder={t.auth.passwordMinPlaceholder}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm" className="text-xs text-muted-foreground uppercase tracking-wider">
              {t.auth.confirmPassword}
            </label>
            <input
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="retro-field w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none"
              placeholder={t.auth.passwordPlaceholder}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? t.auth.saving : t.auth.savePassword}
          </button>
        </form>
      </div>
    </div>
  );
}
