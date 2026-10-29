"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeReturnTarget } from "@/components/SessionExpiryGuard";
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
  const params = useSearchParams();
  const { t } = useStandaloneTranslations();
  // Only on a real expiry, never on the first visit to a bookmark.
  const sessionExpired = params.get("abgelaufen") === "1";
  const returnTo = safeReturnTarget(params.get("redirect"));
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
      // next-auth returns the CredentialsSignin subclass's code on the result
      // itself. Reading it out of result.url — as this did until now — never
      // worked: the callback answers 200 without a Location header, so every
      // rejection showed the generic wrong-password text, including the
      // rate-limit message added in v0.8.2.
      const code = result.code;
      if (code === "RateLimited") setError(t.auth.tooManyAttempts);
      else if (code === "AccountLocked") setError(t.auth.accountLocked);
      else setError(t.auth.invalidCredentials);
      return;
    }

    router.push(returnTo);
    router.refresh();
  }

  return (
    <div className="min-h-viewport flex items-center justify-center bg-background grid-bg px-4 py-6">
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

        {/* A neutral sentence, not an error: nothing went wrong, the session
            simply ran out. */}
        {sessionExpired && (
          <p className="text-xs text-amber-400 text-center" role="status">
            {t.auth.sessionExpired}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-xs text-muted-foreground uppercase tracking-wider">{t.auth.username}</label>
            <input
              id="username" type="text" required autoComplete="username"
              autoCapitalize="none" autoCorrect="off" spellCheck={false}
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
