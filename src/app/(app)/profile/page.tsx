"use client";

import { useState, useEffect, type FormEvent } from "react";
import { signOut } from "next-auth/react";

type Profile = { id: string; name: string; email: string; role: string; preferredLanguage: string };

const LANGUAGES = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
];

export default function ProfilePage() {
  const [profile, setProfile]         = useState<Profile | null>(null);
  const [name, setName]               = useState("");
  const [lang, setLang]               = useState("de");
  const [saving, setSaving]           = useState(false);
  const [savedMsg, setSavedMsg]       = useState("");
  const [pwCurrent, setPwCurrent]     = useState("");
  const [pwNew, setPwNew]             = useState("");
  const [pwConfirm, setPwConfirm]     = useState("");
  const [pwSaving, setPwSaving]       = useState(false);
  const [pwMsg, setPwMsg]             = useState("");
  const [pwError, setPwError]         = useState("");

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
    if (pwNew.length < 8)    { setPwError("Mindestens 8 Zeichen erforderlich."); return; }
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

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h2 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest">Profil &amp; Einstellungen</h2>
        {profile && (
          <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
        )}
      </div>

      {/* Profile form */}
      <form onSubmit={handleSave} className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-sm font-medium text-foreground">Persönliche Daten</h3>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="retro-field w-full"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">E-Mail</label>
          <input
            type="email"
            value={profile?.email ?? ""}
            disabled
            className="retro-field w-full opacity-50 cursor-not-allowed"
          />
          <p className="text-[10px] text-muted-foreground">E-Mail kann nur durch einen Admin geändert werden.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Sprache</label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="retro-field w-full"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition"
          >
            {saving ? "Speichere…" : "Speichern"}
          </button>
          {savedMsg && <span className="text-xs text-green-500">{savedMsg}</span>}
        </div>
      </form>

      {/* Password form */}
      <form onSubmit={handlePasswordChange} className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-sm font-medium text-foreground">Passwort ändern</h3>

        {["Aktuelles Passwort", "Neues Passwort", "Neues Passwort bestätigen"].map((label, i) => {
          const val = [pwCurrent, pwNew, pwConfirm][i];
          const setter = [setPwCurrent, setPwNew, setPwConfirm][i];
          return (
            <div key={label} className="space-y-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</label>
              <input
                type="password"
                value={val}
                onChange={(e) => setter(e.target.value)}
                className="retro-field w-full"
                required
              />
            </div>
          );
        })}

        {pwError && <p className="text-xs text-destructive">{pwError}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pwSaving}
            className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition"
          >
            {pwSaving ? "Ändere…" : "Passwort ändern"}
          </button>
          {pwMsg && <span className="text-xs text-green-500">{pwMsg}</span>}
        </div>
      </form>

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
