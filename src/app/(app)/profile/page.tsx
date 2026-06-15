"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { signOut } from "next-auth/react";

type Profile = { id: string; name: string; email: string; role: string; preferredLanguage: string; mfaEnabled: boolean };

const LANGUAGES = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [lang, setLang] = useState("de");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  // MFA
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaMsg, setMfaMsg] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaDisableToken, setMfaDisableToken] = useState("");
  const [showDisable, setShowDisable] = useState(false);

  // Export / Import
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [importError, setImportError] = useState("");
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d: Profile | null) => {
        if (d) { setProfile(d); setName(d.name); setLang(d.preferredLanguage); }
      });
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedMsg("");
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, preferredLanguage: lang }),
    });
    setSaving(false);
    if (res.ok) {
      const updated: Profile = await res.json();
      setProfile(updated);
      setSavedMsg("Gespeichert!");
      setTimeout(() => setSavedMsg(""), 2500);
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPwError(""); setPwMsg("");
    if (pwNew !== pwConfirm) { setPwError("Passwörter stimmen nicht überein."); return; }
    if (pwNew.length < 8) { setPwError("Mindestens 8 Zeichen erforderlich."); return; }
    setPwSaving(true);
    const res = await fetch("/api/user/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
    });
    setPwSaving(false);
    if (res.ok) {
      setPwMsg("Passwort erfolgreich geändert!");
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
      setTimeout(() => setPwMsg(""), 3000);
    } else {
      const d = await res.json().catch(() => ({}));
      setPwError((d as { error?: string }).error ?? "Fehler beim Ändern.");
    }
  }

  async function startMfaSetup() {
    setMfaLoading(true); setMfaError(""); setMfaMsg("");
    const res = await fetch("/api/auth/mfa/setup");
    setMfaLoading(false);
    if (res.ok) {
      const { qrDataUrl } = await res.json();
      setMfaQr(qrDataUrl);
      setMfaToken("");
    } else {
      setMfaError("Fehler beim Setup.");
    }
  }

  async function verifyMfa(e: FormEvent) {
    e.preventDefault();
    setMfaLoading(true); setMfaError("");
    const res = await fetch("/api/auth/mfa/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: mfaToken }),
    });
    setMfaLoading(false);
    if (res.ok) {
      setMfaMsg("MFA aktiviert!");
      setMfaQr(null);
      setMfaToken("");
      setProfile((p) => p ? { ...p, mfaEnabled: true } : p);
    } else {
      const d = await res.json().catch(() => ({}));
      setMfaError((d as { error?: string }).error ?? "Ungültiger Code.");
    }
  }

  async function disableMfa(e: FormEvent) {
    e.preventDefault();
    setMfaLoading(true); setMfaError("");
    const res = await fetch("/api/auth/mfa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: mfaDisableToken }),
    });
    setMfaLoading(false);
    if (res.ok) {
      setMfaMsg("MFA deaktiviert.");
      setShowDisable(false);
      setMfaDisableToken("");
      setProfile((p) => p ? { ...p, mfaEnabled: false } : p);
    } else {
      const d = await res.json().catch(() => ({}));
      setMfaError((d as { error?: string }).error ?? "Ungültiger Code.");
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportMsg(""); setImportError("");
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (res.ok) {
        setImportMsg(`${data.created} Items importiert, ${data.skipped} übersprungen.`);
      } else {
        setImportError(data.error ?? "Import fehlgeschlagen.");
      }
    } catch {
      setImportError("Ungültige JSON-Datei.");
    } finally {
      setImporting(false);
      if (importFileRef.current) importFileRef.current.value = "";
    }
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h2 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest">Profil &amp; Einstellungen</h2>
        {profile && <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>}
      </div>

      {/* Profile */}
      <Section title="Persönliche Daten">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Name">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="retro-field w-full" required />
          </Field>
          <Field label="E-Mail" hint="E-Mail kann nur durch einen Admin geändert werden.">
            <input type="email" value={profile?.email ?? ""} disabled className="retro-field w-full opacity-50 cursor-not-allowed" />
          </Field>
          <Field label="Sprache">
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="retro-field w-full">
              {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </Field>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition">
              {saving ? "Speichere…" : "Speichern"}
            </button>
            {savedMsg && <span className="text-xs text-green-500">{savedMsg}</span>}
          </div>
        </form>
      </Section>

      {/* Password */}
      <Section title="Passwort ändern">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {(["Aktuelles Passwort", "Neues Passwort", "Neues Passwort bestätigen"] as const).map((label, i) => {
            const val = [pwCurrent, pwNew, pwConfirm][i];
            const setter = [setPwCurrent, setPwNew, setPwConfirm][i];
            return (
              <Field key={label} label={label}>
                <input type="password" value={val} onChange={(e) => setter(e.target.value)} className="retro-field w-full" required />
              </Field>
            );
          })}
          {pwError && <p className="text-xs text-destructive">{pwError}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={pwSaving} className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition">
              {pwSaving ? "Ändere…" : "Passwort ändern"}
            </button>
            {pwMsg && <span className="text-xs text-green-500">{pwMsg}</span>}
          </div>
        </form>
      </Section>

      {/* MFA */}
      <Section title="Zwei-Faktor-Authentifizierung (TOTP)">
        <p className="text-xs text-muted-foreground">
          {profile?.mfaEnabled
            ? "MFA ist aktiv. Du wirst beim Login nach einem 6-stelligen Code aus deiner Authenticator-App gefragt."
            : "Sichere deinen Account mit einem Authenticator (z.B. Google Authenticator, Authy)."}
        </p>

        {mfaMsg && <p className="text-xs text-green-500">{mfaMsg}</p>}
        {mfaError && <p className="text-xs text-destructive">{mfaError}</p>}

        {!profile?.mfaEnabled && !mfaQr && (
          <button onClick={startMfaSetup} disabled={mfaLoading} className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition">
            {mfaLoading ? "Lade…" : "MFA einrichten"}
          </button>
        )}

        {!profile?.mfaEnabled && mfaQr && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Scanne diesen QR-Code mit deiner Authenticator-App:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mfaQr} alt="QR Code" className="w-40 h-40 rounded-lg border border-border" />
            <form onSubmit={verifyMfa} className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={mfaToken}
                onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="retro-field w-32 font-mono text-center tracking-widest"
                required
              />
              <button type="submit" disabled={mfaLoading || mfaToken.length !== 6} className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition">
                {mfaLoading ? "Prüfe…" : "Bestätigen"}
              </button>
              <button type="button" onClick={() => setMfaQr(null)} className="text-xs text-muted-foreground hover:text-foreground">Abbrechen</button>
            </form>
          </div>
        )}

        {profile?.mfaEnabled && !showDisable && (
          <button onClick={() => { setShowDisable(true); setMfaError(""); }} className="rounded-md border border-destructive/50 px-4 py-2 text-xs font-medium text-destructive uppercase tracking-wider hover:bg-destructive/10 transition">
            MFA deaktivieren
          </button>
        )}

        {profile?.mfaEnabled && showDisable && (
          <form onSubmit={disableMfa} className="space-y-3">
            <p className="text-xs text-muted-foreground">Code aus deiner Authenticator-App eingeben:</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={mfaDisableToken}
                onChange={(e) => setMfaDisableToken(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="retro-field w-32 font-mono text-center tracking-widest"
                required
              />
              <button type="submit" disabled={mfaLoading || mfaDisableToken.length !== 6} className="rounded-md border border-destructive px-4 py-2 text-xs font-medium text-destructive uppercase tracking-wider hover:bg-destructive/10 disabled:opacity-50 transition">
                {mfaLoading ? "Prüfe…" : "Deaktivieren"}
              </button>
              <button type="button" onClick={() => setShowDisable(false)} className="text-xs text-muted-foreground hover:text-foreground">Abbrechen</button>
            </div>
          </form>
        )}
      </Section>

      {/* Export / Import */}
      <Section title="Daten Export &amp; Import">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-3">Alle deine Items als Datei exportieren:</p>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/export?format=json"
                download
                className="rounded-md border border-border px-4 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition"
              >
                JSON exportieren
              </a>
              <a
                href="/api/export?format=csv"
                download
                className="rounded-md border border-border px-4 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition"
              >
                CSV exportieren
              </a>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground mb-3">Items aus einer RetroMan-JSON-Exportdatei importieren:</p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => importFileRef.current?.click()}
                disabled={importing}
                className="rounded-md border border-border px-4 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition disabled:opacity-50"
              >
                {importing ? "Importiere…" : "JSON-Datei wählen"}
              </button>
              <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              {importMsg && <span className="text-xs text-green-500">{importMsg}</span>}
              {importError && <span className="text-xs text-destructive">{importError}</span>}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">Nur das RetroMan-JSON-Format wird unterstützt. Maximal 5.000 Items pro Import.</p>
          </div>
        </div>
      </Section>

      {/* DSGVO */}
      <Section title="Datenschutz (DSGVO)">
        <p className="text-xs text-muted-foreground">Vollständigen Download aller deiner gespeicherten Daten anfordern:</p>
        <a
          href="/api/export?format=gdpr"
          download
          className="inline-block rounded-md border border-border px-4 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition"
        >
          Datenpakt herunterladen (JSON)
        </a>
      </Section>

      {/* Account löschen */}
      <AccountDeleteSection onDeleted={() => signOut({ callbackUrl: "/login" })} />

      {/* Logout */}
      <div className="rounded-xl border border-destructive/30 bg-card p-6 space-y-3">
        <h3 className="text-sm font-medium text-destructive">Abmelden</h3>
        <p className="text-xs text-muted-foreground">Sitzung beenden und zum Login zurückkehren.</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-md border border-destructive px-4 py-2 text-xs font-medium text-destructive uppercase tracking-wider hover:bg-destructive hover:text-white transition"
        >
          Abmelden
        </button>
      </div>
    </div>
  );
}

function AccountDeleteSection({ onDeleted }: { onDeleted: () => void }) {
  const [step, setStep]       = useState<"idle" | "confirm">("idle");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError]     = useState("");

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setDeleting(true); setError("");
    const res = await fetch("/api/me/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setDeleting(false);
    if (res.ok) {
      onDeleted();
    } else {
      const d = await res.json().catch(() => ({}));
      setError((d as { error?: string }).error ?? "Fehler.");
    }
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-card p-6 space-y-3">
      <h3 className="text-sm font-medium text-destructive">Account löschen</h3>
      <p className="text-xs text-muted-foreground">
        Dein Account und alle deine Daten werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
      </p>

      {step === "idle" && (
        <button
          onClick={() => setStep("confirm")}
          className="rounded-md border border-destructive/50 px-4 py-2 text-xs font-medium text-destructive uppercase tracking-wider hover:bg-destructive/10 transition"
        >
          Account löschen
        </button>
      )}

      {step === "confirm" && (
        <form onSubmit={handleDelete} className="space-y-3">
          <p className="text-xs text-destructive font-medium">Bestätige mit deinem Passwort:</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="retro-field w-full"
            placeholder="Passwort eingeben"
            required
            autoComplete="current-password"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={deleting || !password}
              className="rounded-md bg-destructive px-4 py-2 text-xs font-medium text-white uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition"
            >
              {deleting ? "Lösche…" : "Dauerhaft löschen"}
            </button>
            <button type="button" onClick={() => { setStep("idle"); setPassword(""); setError(""); }} className="text-xs text-muted-foreground hover:text-foreground">Abbrechen</button>
          </div>
        </form>
      )}
    </div>
  );
}
