"use client";

import { useEffect, useState } from "react";

interface Role {
  id: string;
  name: string;
  permissions: string[];
  createdAt: string;
}

const ALL_PERMISSIONS = [
  // Articles
  "article.read", "article.create", "article.update", "article.delete",
  "article.translate", "article.rewrite", "article.publish",
  // Jobs
  "job.read", "job.create", "job.update", "job.delete", "job.run",
  // Sites
  "site.read", "site.create", "site.update", "site.delete",
  // Prompts
  "prompt.read", "prompt.create", "prompt.update", "prompt.delete",
  // Settings
  "settings.read", "settings.update",
  // Users
  "user.read", "user.create", "user.update", "user.delete",
  // Roles
  "role.read", "role.create", "role.update", "role.delete",
];

const ROLE_COLORS: Record<string, string> = {
  admin:   "bg-fail/15 text-fail",
  partner: "bg-brand/15 text-brand",
  user:    "bg-surface-border text-content-secondary",
};

function PermissionBadge({ perm }: { perm: string }) {
  const [ns, action] = perm.split(".");
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-sm bg-surface-muted border border-surface-border text-content-secondary font-mono">
      <span className="text-brand">{ns}</span>
      <span className="text-content-muted">.</span>
      <span>{action}</span>
    </span>
  );
}

function RoleModal({
  initial,
  onClose,
  onSave,
  saving,
}: {
  initial?: Role;
  onClose: () => void;
  onSave: (data: { name: string; permissions: string[] }) => void;
  saving: boolean;
}) {
  const [name,  setName]  = useState(initial?.name ?? "");
  const [perms, setPerms] = useState<string[]>(initial?.permissions ?? []);

  function togglePerm(p: string) {
    setPerms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  function toggleAll() {
    setPerms((prev) => prev.length === ALL_PERMISSIONS.length ? [] : [...ALL_PERMISSIONS]);
  }

  const groups = ALL_PERMISSIONS.reduce<Record<string, string[]>>((acc, p) => {
    const [ns] = p.split(".");
    (acc[ns] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface-raised border border-surface-border rounded-lg shadow-card w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-[14px] font-semibold text-content-primary">
            {initial ? `Sửa role: ${initial.name}` : "Thêm role mới"}
          </h2>
          <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">Tên role</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!!initial}
              className="w-full px-3 py-2 bg-surface-muted border border-surface-border rounded-sm text-[13px] text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors disabled:opacity-50"
              placeholder="vd: editor, moderator..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-medium text-content-muted uppercase tracking-wider">Permissions</label>
              <button onClick={toggleAll} className="text-[11px] text-brand hover:underline">
                {perms.length === ALL_PERMISSIONS.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>
            </div>
            <div className="space-y-3 bg-surface-muted border border-surface-border rounded-sm p-3">
              {Object.entries(groups).map(([ns, list]) => (
                <div key={ns}>
                  <p className="text-[10px] font-medium text-content-muted uppercase tracking-wider mb-1.5">{ns}</p>
                  <div className="flex flex-wrap gap-2">
                    {list.map((p) => (
                      <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={perms.includes(p)}
                          onChange={() => togglePerm(p)}
                          className="w-3.5 h-3.5 rounded border-surface-border accent-brand"
                        />
                        <span className="text-[12px] text-content-primary font-mono">{p.split(".")[1]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-content-muted mt-1.5">{perms.length} permission đã chọn</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-surface-border">
          <button onClick={onClose} className="px-4 py-2 text-[13px] border border-surface-border text-content-secondary hover:text-content-primary rounded-sm transition-colors">
            Hủy
          </button>
          <button
            onClick={() => onSave({ name: name.trim(), permissions: perms })}
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-brand hover:bg-brand-hover text-white text-[13px] rounded-sm disabled:opacity-40 transition-colors"
          >
            {saving && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {initial ? "Cập nhật" : "Tạo role"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RolesPage() {
  const [roles,   setRoles]   = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing,    setEditing]    = useState<Role | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch("/api/roles");
      const data = await res.json();
      if (res.ok) setRoles(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(data: { name: string; permissions: string[] }) {
    setSaving(true);
    try {
      const res  = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { showToast(false, json.error ?? "Tạo thất bại"); return; }
      setShowCreate(false);
      showToast(true, `Tạo role "${data.name}" thành công`);
      setRoles((prev) => [...prev, json].sort((a, b) => a.name.localeCompare(b.name)));
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(data: { name: string; permissions: string[] }) {
    if (!editing) return;
    setSaving(true);
    try {
      const res  = await fetch(`/api/roles/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: data.permissions }),
      });
      const json = await res.json();
      if (!res.ok) { showToast(false, json.error ?? "Cập nhật thất bại"); return; }
      setEditing(null);
      showToast(true, "Cập nhật role thành công");
      setRoles((prev) => prev.map((r) => r.id === editing.id ? json : r));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role: Role) {
    if (!confirm(`Xóa role "${role.name}"?`)) return;
    setDeleting(role.id);
    try {
      const res  = await fetch(`/api/roles/${role.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { showToast(false, json.error ?? "Xóa thất bại"); return; }
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      showToast(true, `Đã xóa role "${role.name}"`);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Roles</h1>
          <p className="text-sm text-content-muted mt-1">Quản lý vai trò và quyền hạn</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-[13px] font-medium rounded-sm transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Thêm role
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="bg-surface-raised border border-surface-border rounded-lg p-8 flex justify-center">
            <div className="w-7 h-7 border-2 border-surface-border border-t-brand rounded-full animate-spin" />
          </div>
        ) : roles.length === 0 ? (
          <div className="bg-surface-raised border border-surface-border rounded-lg p-12 flex flex-col items-center text-content-muted gap-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="opacity-30">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <p className="text-[13px]">Chưa có role nào</p>
          </div>
        ) : roles.map((role) => (
          <div key={role.id} className="bg-surface-raised border border-surface-border rounded-lg p-4 hover:border-content-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className={`text-[12px] font-semibold px-2.5 py-0.5 rounded-sm ${ROLE_COLORS[role.name] ?? "bg-surface-border text-content-secondary"}`}>
                    {role.name}
                  </span>
                  <span className="text-[11px] text-content-muted">
                    {role.permissions.includes("*") ? "Toàn quyền" : `${role.permissions.length} permission`}
                  </span>
                </div>

                {role.permissions.includes("*") ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-sm bg-fail/15 text-fail font-mono">* (wildcard)</span>
                ) : role.permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.map((p) => <PermissionBadge key={p} perm={p} />)}
                  </div>
                ) : (
                  <p className="text-[12px] text-content-muted italic">Không có permission nào</p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setEditing(role)}
                  className="text-[11px] px-2.5 py-1.5 border border-surface-border text-content-secondary hover:text-content-primary hover:border-content-muted rounded-sm transition-colors"
                >
                  Sửa
                </button>
                <button
                  onClick={() => handleDelete(role)}
                  disabled={deleting === role.id}
                  className="text-[11px] px-2.5 py-1.5 bg-fail/10 text-fail/70 hover:bg-fail/20 hover:text-fail rounded-sm disabled:opacity-40 transition-colors"
                >
                  {deleting === role.id ? "..." : "Xóa"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <RoleModal onClose={() => setShowCreate(false)} onSave={handleCreate} saving={saving} />
      )}
      {editing && (
        <RoleModal initial={editing} onClose={() => setEditing(null)} onSave={handleEdit} saving={saving} />
      )}

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-md shadow-card border text-[13px] ${
          toast.ok ? "bg-ok/10 border-ok/30 text-ok" : "bg-fail/10 border-fail/30 text-fail"
        }`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {toast.ok ? <polyline points="20 6 9 17 4 12"/> : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
          </svg>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
