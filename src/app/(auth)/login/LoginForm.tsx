"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useStandaloneTranslations } from "@/hooks/useStandaloneTranslations";

export default function LoginForm({
  canResetPassword = false,
  passwordWasReset = false,
}: {
  canResetPassword?: boolean;
  passwordWasReset?: boolean;
}) {
  const router = useRouter();
  const { t } = useStandaloneTranslations();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      const code = result.url ? new URL(result.url, window.location.origin).searchParams.get("code") : null;
      setError(code === "RateLimited" ? t.auth.tooManyAttempts : t.auth.invalidCredentials);
      return;
    }

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
          <p className="slogan-glow text-sm tracking-widest italic">{t.auth.slogan}</p>
        </div>

        {passwordWasReset && (
          <p className="text-xs text-primary text-center" role="status">
            {t.auth.passwordWasReset}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-xs text-muted-foreground uppercase tracking-wider">{t.auth.username}</label>
            <input
              id="username" type="text" required autoComplete="username"
              value={username} onChange={(e) => setUsername(e.target.value)}
              className="retro-field w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-xs text-muted-foreground uppercase tracking-wider">{t.auth.password}</label>
            <input
              id="password" type="password" required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="retro-field w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider transition hover:opacity-90 disabled:opacity-50 neon-border"
          >
            {loading ? t.auth.signingIn : t.auth.signIn}
          </button>

          {canResetPassword && (
            <div className="text-center">
              <Link href="/forgot-password" className="auth-secondary-link text-xs">
                {t.auth.forgotPassword}
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
