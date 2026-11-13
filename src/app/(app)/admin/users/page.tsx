"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "@/components/LanguageProvider";
import { DangerZone } from "@/components/ui/DangerZone";
import { FormDialog, NoticeDialog } from "@/components/ui/FormDialog";
import { errorText } from "@/lib/api/errorText";
import { useDeleteImpact } from "@/components/ui/useDeleteImpact";
import { IconCheck, IconDash, IconKey, IconPower, IconShieldOff, IconSignOutAll, IconTrash, IconUnlock } from "@/components/ui/RowIcons";

type User = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  deletedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  /** Set while an account is locked out after failed sign-ins. */
  lockedUntil: string | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const EMPTY_FORM = { username: "", name: "", email: "", role: "USER" };

export default function AdminUsersPage() {
  const { t } = useTranslations();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  /**
   * What to tell the admin after creating an account or resetting a password.
   * Two shapes, because there are two different things to say: an invitation
   * went out (and no password exists to show), or here is the one-time
   * password — possibly because the mail did not go out.
   */
  const [result, setResult] = useState<
    | { kind: "password"; name: string; password: string; mailError?: string }
    | { kind: "invited"; name: string; email: string }
    | null
  >(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  // The row for one's own account offers neither switching off nor deleting:
  // the API refuses both (Codebook docs/user-management.md, self-protection),
  // and a button whose only outcome is a refusal is a trap, not a safeguard.
  const [ownId, setOwnId] = useState<string | null>(null);
  // Counted on the server and fetched when the dialog opens, so a long
  // user list does not fire one request per row.
  const deleteImpact = useDeleteImpact(deleteTarget ? { type: "admin:user", id: deleteTarget.id } : null);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { id?: string } | null) => { if (d?.id) setOwnId(d.id); })
      .catch((err) => {
        // Not fatal: without the id the own row keeps its buttons and the
        // server refuses them. Worth a line, though — silence here would hide
        // a broken /api/me behind a merely odd-looking table.
        console.error("[admin/users] eigene Kennung nicht geladen", err);
      });
  }, []);

  // What closing the dialog would lose — asked about before it is lost.
  const createDirty =
    form.username !== EMPTY_FORM.username || form.name !== EMPTY_FORM.name ||
    form.email !== EMPTY_FORM.email || form.role !== EMPTY_FORM.role;

  const neverLoggedInCount = users.filter((u) => !u.deletedAt && !u.lastLoginAt).length;

  async function handleCreate(): Promise<void> {
    setFormError("");
    setSubmitting(true);
    let res: Response;
    try {
      res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } catch (error) {
      // No answer at all: the dialog and its input stay, with the reason.
      setSubmitting(false);
      setFormError(error instanceof Error ? error.message : String(error));
      return;
    }
    setSubmitting(false);
    // Refused (name taken, address invalid …): the message goes into the
    // dialog and the input stays, so it can be corrected in place.
    if (!res.ok) { setFormError(await errorText(res, t.common.error)); return; }
    const { user, tempPassword, invitedByMail, mailFailed, mailError } = await res.json();
    setUsers((prev) => [
      ...prev,
      { ...user, deletedAt: null, mfaEnabled: false, lastLoginAt: null, lockedUntil: null },
    ]);
    setShowCreate(false);
    setForm(EMPTY_FORM);

    // Three outcomes, not one — Codebook docs/user-management.md, point 4.
    // With a mail server the admin sees no password at all; without one, or
    // when the mail did not go out, the one-time password is the only way in
    // and has to be shown, with the reason.
    if (invitedByMail) {
      setResult({ kind: "invited", name: user.name, email: user.email });
      return;
    }
    setResult({
      kind: "password",
      name: user.name,
      password: tempPassword,
      ...(mailFailed ? { mailError: mailError ?? "" } : {}),
    });
  }

  async function handleResetPassword(id: string, name: string) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset-password" }),
    });
    if (res.ok) {
      const { tempPassword } = await res.json();
      setResult({ kind: "password", name, password: tempPassword });
      loadUsers();
    }
  }

  async function handleToggleActive(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle-active" }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? t.common.error);
      return;
    }
    loadUsers();
  }

  async function handleDisableMfa(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disable-mfa" }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? t.common.error);
      return;
    }
    loadUsers();
  }

  // Codebook docs/user-management.md, points 2 and 3 of "Vier Erweiterungen
  // aus TransportMans Benutzerverwaltung". Both are a single PATCH and share
  // their error handling, so they share one helper — a copy per action is how
  // one of them ends up swallowing its errors.
  async function handleUserAction(id: string, action: "unlock" | "revoke-sessions") {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const text = await res.text();
      let message = text;
      try { message = JSON.parse(text).error ?? text; } catch { /* not json */ }
      alert(message || `${t.common.error} (${res.status})`);
      return;
    }
    loadUsers();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      // Thrown so the danger zone shows it and stays open. A 500 can have
      // an empty body, which is why this does not assume JSON.
      const text = await res.text();
      let message = text;
      try { message = JSON.parse(text).error ?? text; } catch { /* not json */ }
      throw new Error(message || `${t.common.error} (${res.status})`);
    }
    setDeleteTarget(null);
    loadUsers();
  }

  function loginStatus(user: User) {
    if (!user.lastLoginAt) {
      return (
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
          {t.adminUsers.neverLoggedIn}
        </span>
      );
    }
    if (user.mustChangePassword) {
      // Date and time belong in the column, not only in a tooltip: a tooltip
      // never appears on a phone, and on a desktop nobody hovers a column
      // they are scanning. Who has signed in and when must be readable at a
      // glance - that is what the column is for.
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-400">
            {t.adminUsers.firstLoginPending}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums">{formatDate(user.lastLoginAt)}</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] text-muted-foreground tabular-nums">{formatDate(user.lastLoginAt)}</span>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest">
            {t.adminUsers.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{users.length} {t.adminUsers.countLabel}</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setFormError(""); setShowCreate(true); }}
          className="flex items-center gap-2 retro-btn rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider transition hover:opacity-90"
        >
          {t.adminUsers.newUser}
        </button>
      </div>

      {/* Never-logged-in banner */}
      {neverLoggedInCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <span className="text-amber-400 text-sm">⚠</span>
          <p className="text-xs text-amber-400">
            <span className="font-semibold">{neverLoggedInCount} {t.adminUsers.countLabel}</span>{" "}
            {neverLoggedInCount === 1 ? t.adminUsers.neverLoggedInBanner : t.adminUsers.neverLoggedInBannerPlural}.
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t.common.loading}</p>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">{t.adminUsers.empty}</p>
        </div>
      ) : (
        <div className="table-cards overflow-x-auto rounded-xl border border-l-[3px] border-border border-l-primary bg-card shadow-sm">
          <table className="w-full">
            <thead className="bg-sidebar">
              <tr>
                {[t.adminUsers.colName, t.adminUsers.colEmail, t.adminUsers.colRole, t.adminUsers.colStatus, t.adminUsers.colMfa, t.adminUsers.colLastLogin, t.adminUsers.colActions].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className={`bg-card transition-colors hover:bg-muted/40 ${user.deletedAt ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3.5" data-card-title>
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                    {user.mustChangePassword && (
                      <p className="text-[10px] text-orange-400">{t.adminUsers.passwordPending}</p>
                    )}
                  </div>
                </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground" data-label={t.adminUsers.colEmail}>
                    <span className="break-all">{user.email}</span>
                  </td>
                  <td className="px-4 py-3.5" data-label={t.adminUsers.colRole}>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${
                      user.role === "ADMIN"
                        ? "border-primary/50 bg-primary/10 text-primary-text"
                        : "border-border bg-muted text-muted-foreground"
                    }`}>
                      {user.role === "ADMIN" ? t.adminUsers.roleAdmin : t.adminUsers.roleUser}
                    </span>
                  </td>
                  {/* Codebook docs/product-standards.md, "Benutzerverwaltung
                      unter Einstellungen": the status is a chip with a coloured
                      left edge, not a rounded outline badge. Only the status
                      takes that form — the role and the sign-in stay pills, so
                      the one state the row is really about is told apart by its
                      SHAPE and not only by its colour. That still carries for
                      someone who cannot tell the colours apart. */}
                  <td className="px-4 py-3.5" data-label={t.adminUsers.colStatus}>
                    <span className={`inline-block rounded border border-l-[3px] border-border px-2 py-0.5 text-[10px] font-medium ${
                      user.deletedAt
                        ? "border-l-destructive bg-destructive/10 text-destructive"
                        : "border-l-green-500 bg-green-500/10 text-green-500"
                    }`}>
                      {user.deletedAt ? t.adminUsers.statusDeactivated : t.adminUsers.statusActive}
                    </span>
                  </td>
                  {/* Two-factor gets a column of its own. It used to be legible
                      only indirectly, from whether the "switch off 2FA" button
                      appeared in the action bar — an absent button is not an
                      answer to "does this account have a second factor". */}
                  <td className="px-4 py-3.5" data-label={t.adminUsers.colMfa}>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] ${
                      user.mfaEnabled ? "text-green-500" : "text-muted-foreground"
                    }`}>
                      {user.mfaEnabled ? <IconCheck /> : <IconDash />}
                      {user.mfaEnabled ? t.common.yes : t.common.no}
                    </span>
                  </td>
                  <td className="px-4 py-3.5" data-label={t.adminUsers.colLastLogin}>
                    {loginStatus(user)}
                  </td>
                  <td className="px-4 py-3.5" data-card-actions>
                    {/* One bordered group, dividers between the icons,
                        the destructive action last and in the warning tone. */}
                    <div className="inline-flex overflow-hidden rounded-md border border-border">
                      <button
                        onClick={() => handleResetPassword(user.id, user.name)}
                        title={t.adminUsers.resetPassword}
                        aria-label={t.adminUsers.resetPassword}
                        className="tap-target retro-btn-row grid place-items-center border-r border-border px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                      >
                        <IconKey />
                      </button>
                      {user.mfaEnabled && (
                        <button
                          onClick={() => handleDisableMfa(user.id)}
                          title={t.adminUsers.disableMfaTitle}
                          aria-label={t.adminUsers.disableMfa}
                          className="tap-target retro-btn-row grid place-items-center border-r border-border px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                        >
                          <IconShieldOff />
                        </button>
                      )}
                      {/* Only while the account is actually locked: a button
                          that does nothing on most rows teaches people to
                          ignore it. */}
                      {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                        <button
                          onClick={() => handleUserAction(user.id, "unlock")}
                          title={t.adminUsers.unlockTitle}
                          aria-label={t.adminUsers.unlock}
                          className="tap-target retro-btn-row grid place-items-center border-r border-border px-2 py-1.5 text-amber-400 hover:bg-amber-500/10 transition"
                        >
                          <IconUnlock />
                        </button>
                      )}
                      {/* Only for accounts that have ever signed in — there is
                          nothing to end otherwise. Not offered for one's own
                          account; the API refuses that and points at
                          "Abmelden". */}
                      {user.lastLoginAt && (
                        <button
                          onClick={() => handleUserAction(user.id, "revoke-sessions")}
                          title={t.adminUsers.revokeSessionsTitle}
                          aria-label={t.adminUsers.revokeSessions}
                          className="tap-target retro-btn-row grid place-items-center border-r border-border px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                        >
                          <IconSignOutAll />
                        </button>
                      )}
                      {/* An administrator may now be switched off or removed
                          by ANOTHER administrator — before, no admin account
                          could ever be touched, which meant a departing admin
                          stayed active forever. The server still refuses the
                          last active one. */}
                      {user.id !== ownId ? (
                        <>
                          <button
                            onClick={() => handleToggleActive(user.id)}
                            title={user.deletedAt ? t.adminUsers.activate : t.adminUsers.deactivate}
                            aria-label={user.deletedAt ? t.adminUsers.activate : t.adminUsers.deactivate}
                            className={`tap-target retro-btn-row grid place-items-center border-r border-border px-2 py-1.5 transition ${
                              user.deletedAt
                                ? "text-green-500 hover:bg-green-500/10"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <IconPower />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(user)}
                            title={t.adminUsers.deleteForever}
                            aria-label={t.adminUsers.deleteForever}
                            className="tap-target retro-btn-row grid place-items-center px-2 py-1.5 text-destructive hover:bg-destructive/10 transition"
                          >
                            <IconTrash />
                          </button>
                        </>
                      ) : (
                        <span className="retro-btn-row grid place-items-center px-2 py-1.5 text-[10px] text-muted-foreground/50 italic" title={t.adminUsers.ownAccountProtected}>
                          —
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create user — Codebook "Anlegen als Overlay": header with Abbrechen
          and Erstellen, no ✕, and a question before input is thrown away. */}
      {showCreate && (
        <FormDialog
          title={t.adminUsers.createTitle}
          submitLabel={t.common.create}
          busyLabel={t.common.creating}
          busy={submitting}
          dirty={createDirty}
          error={formError}
          onSubmit={handleCreate}
          onClose={() => { setShowCreate(false); setFormError(""); }}
        >
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.adminUsers.colUsername}</label>
            {/* autoComplete="off", not "username": this field names someone
                else's account, and the keychain would otherwise offer the
                admin their own sign-in to fill in. */}
            <input
              required
              autoFocus
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="retro-field w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none"
              placeholder={t.adminUsers.usernamePlaceholder}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.adminUsers.colName}</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="retro-field w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none"
              placeholder={t.adminUsers.namePlaceholder}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.adminUsers.colEmail}</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="retro-field w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none"
              placeholder={t.adminUsers.emailPlaceholder}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.adminUsers.role}</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="retro-field w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none"
            >
              <option value="USER">{t.adminUsers.roleUser}</option>
              <option value="ADMIN">{t.adminUsers.roleAdmin}</option>
            </select>
          </div>
        </FormDialog>
      )}

      <DangerZone
        open={deleteTarget !== null}
        subject={deleteTarget?.name ?? ""}
        description={t.adminUsers.deleteUserText}
        impact={deleteImpact}
        confirmLabel={t.adminUsers.deleteForever}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Was nach dem Anlegen oder einem Passwort-Reset zu sagen ist.
          Codebook docs/user-management.md, Punkt 4: mit Mailserver sieht der
          Admin kein Passwort, ohne einen bleibt das Einmal-Passwort der
          einzige Weg. */}
      {result?.kind === "invited" && (
        <NoticeDialog title={t.adminUsers.invitedTitle} buttonLabel={t.adminUsers.understood} onClose={() => setResult(null)}>
          <p className="text-sm text-muted-foreground">
            {t.adminUsers.invitedHint}{" "}
            <span className="font-medium text-foreground">{result.name}</span>.
          </p>
          <div className="rounded-md border border-border bg-muted p-3 text-center">
            <code className="select-all break-all font-mono text-sm text-foreground">
              {result.email}
            </code>
          </div>
          <p className="text-xs text-muted-foreground">{t.adminUsers.invitedNote}</p>
        </NoticeDialog>
      )}

      {result?.kind === "password" && (
        <NoticeDialog title={t.adminUsers.tempPassword} buttonLabel={t.adminUsers.understood} onClose={() => setResult(null)}>
          <p className="text-sm text-muted-foreground">
            {t.adminUsers.tempPasswordHint}{" "}
            <span className="font-medium text-foreground">{result.name}</span>.{" "}
            {t.adminUsers.tempPasswordNote}
          </p>
          {result.mailError !== undefined && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-400">
              {t.adminUsers.inviteMailFailed}
              {result.mailError ? " (" + result.mailError + ")" : ""}
            </p>
          )}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-center">
            <code className="font-mono text-xl text-primary tracking-widest select-all">
              {result.password}
            </code>
          </div>
        </NoticeDialog>
      )}
    </div>
  );
}
