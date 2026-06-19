"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "@/components/LanguageProvider";

type User = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  deletedAt: string | null;
  createdAt: string;
};

export default function AdminUsersPage() {
  const { t } = useTranslations();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [tempPw, setTempPw] = useState<{ name: string; password: string } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "USER" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!res.ok) { setFormError((await res.json()).error ?? t.common.error); return; }
    const { user, tempPassword } = await res.json();
    setUsers((prev) => [...prev, { ...user, deletedAt: null, mfaEnabled: false }]);
    setShowCreate(false);
    setForm({ name: "", email: "", role: "USER" });
    setTempPw({ name: user.name, password: tempPassword });
  }

  async function handleResetPassword(id: string, name: string) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset-password" }),
    });
    if (res.ok) {
      const { tempPassword } = await res.json();
      setTempPw({ name, password: tempPassword });
      loadUsers();
    }
  }

  async function handleToggleActive(id: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle-active" }),
    });
    loadUsers();
  }

  async function handleDelete() {
    if (!deleteTarget || deleteConfirm !== deleteTarget.email) return;
    setDeleting(true);
    await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteTarget(null);
    setDeleteConfirm("");
    loadUsers();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest">
            {t.adminUsers.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{users.length} {t.adminUsers.countLabel}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider transition hover:opacity-90"
        >
          {t.adminUsers.newUser}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t.common.loading}</p>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">{t.adminUsers.empty}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                {[t.adminUsers.colName, t.adminUsers.colEmail, t.adminUsers.colRole, t.adminUsers.colStatus, t.adminUsers.colActions].map((h) => (
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
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    {user.mustChangePassword && (
                      <p className="text-[10px] text-orange-400">{t.adminUsers.passwordPending}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${
                      user.role === "ADMIN"
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground"
                    }`}>
                      {user.role === "ADMIN" ? t.adminUsers.roleAdmin : t.adminUsers.roleUser}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      user.deletedAt
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : "border-green-500/40 bg-green-500/10 text-green-500"
                    }`}>
                      {user.deletedAt ? t.adminUsers.statusDeactivated : t.adminUsers.statusActive}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResetPassword(user.id, user.name)}
                        className="rounded border border-border px-2 py-1 text-[10px] text-muted-foreground hover:border-primary hover:text-primary transition"
                      >
                        {t.adminUsers.resetPassword}
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id)}
                        className={`rounded border px-2 py-1 text-[10px] transition ${
                          user.deletedAt
                            ? "border-green-500/40 text-green-500 hover:bg-green-500/10"
                            : "border-destructive/40 text-destructive hover:bg-destructive/10"
                        }`}
                      >
                        {user.deletedAt ? t.adminUsers.activate : t.adminUsers.deactivate}
                      </button>
                      <button
                        onClick={() => { setDeleteTarget(user); setDeleteConfirm(""); }}
                        className="rounded border border-destructive/40 px-2 py-1 text-[10px] text-destructive hover:bg-destructive/10 transition"
                        title={t.adminUsers.deleteForever}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <h3 className="font-heading text-[10px] text-primary uppercase tracking-widest">
              {t.adminUsers.createTitle}
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
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
              {formError && <p className="text-xs text-destructive">{formError}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setFormError(""); }}
                  className="flex-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition"
                >
                  {submitting ? t.common.creating : t.common.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User DangerZone Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-destructive/50 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-destructive text-lg">⚠️</span>
              <h3 className="font-heading text-[10px] text-destructive uppercase tracking-widest">{t.common.dangerZone}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.adminUsers.userLabel} <span className="font-medium text-foreground">{deleteTarget.name}</span> {t.adminUsers.deleteUserText}
            </p>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t.adminUsers.confirmEmail}
              </label>
              <input
                type="email"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={deleteTarget.email}
                className="retro-field w-full"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }}
                className="flex-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirm !== deleteTarget.email}
                className="flex-1 rounded-md bg-destructive px-3 py-2 text-xs font-medium text-white uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition"
              >
                {deleting ? t.common.deleting : t.adminUsers.deleteForever}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temp Password Modal */}
      {tempPw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="font-heading text-[10px] text-primary uppercase tracking-widest">
              {t.adminUsers.tempPassword}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t.adminUsers.tempPasswordHint}{" "}
              <span className="font-medium text-foreground">{tempPw.name}</span>.{" "}
              {t.adminUsers.tempPasswordNote}
            </p>
            <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-center">
              <code className="font-mono text-xl text-primary tracking-widest select-all">
                {tempPw.password}
              </code>
            </div>
            <button
              onClick={() => setTempPw(null)}
              className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 transition"
            >
              {t.adminUsers.understood}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
