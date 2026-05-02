"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin:   "bg-fail/15 text-fail",
  partner: "bg-brand/15 text-brand",
  user:    "bg-surface-border text-content-secondary",
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface-raised border border-surface-border rounded-lg shadow-card w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-[14px] font-semibold text-content-primary">{title}</h2>
          <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function UserForm({
  initial,
  onSubmit,
  saving,
  isEdit,
  roles,
}: {
  initial?: Partial<User>;
  onSubmit: (data: Record<string, unknown>) => void;
  saving: boolean;
  isEdit?: boolean;
  roles: string[];
}) {
  const [email,       setEmail]       = useState(initial?.email       ?? "");
  const [name,        setName]        = useState(initial?.name        ?? "");
  const [role,        setRole]        = useState(initial?.role        ?? "user");
  const [password,    setPassword]    = useState("");
  const [isActive,    setIsActive]    = useState(initial?.isActive    ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: Record<string, unknown> = { name, role, isActive };
    if (!isEdit) { data.email = email; data.password = password; }
    else if (password) data.password = password;
    onSubmit(data);
  }

  const inputCls = "w-full px-3 py-2 bg-surface-muted border border-surface-border rounded-sm text-[13px] text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isEdit && (
        <div>
          <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="user@example.com" />
        </div>
      )}
      <div>
        <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">Tên</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Họ tên..." />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">
          Mật khẩu {isEdit && <span className="normal-case font-normal text-content-muted">(để trống = không đổi)</span>}
        </label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          required={!isEdit} minLength={8} className={inputCls} placeholder="Tối thiểu 8 ký tự" />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      {isEdit && (
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-surface-border accent-brand" />
          <span className="text-[13px] text-content-primary">Tài khoản đang hoạt động</span>
        </label>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-brand hover:bg-brand-hover text-white text-[13px] rounded-sm disabled:opacity-40 transition-colors">
          {saving && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {isEdit ? "Cập nhật" : "Tạo user"}
        </button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const [users,   setUsers]   = useState<User[]>([]);
  const [roles,   setRoles]   = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [editing,    setEditing]    = useState<User | null>(null);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState<{ ok: boolean; msg: string } | null>(null);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/roles"),
      ]);
      const usersData = await usersRes.json();
      if (!usersRes.ok) { setError(usersData.error ?? "Lỗi tải danh sách"); return; }
      setUsers(usersData.users);
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.map((r: { name: string }) => r.name));
      }
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(data: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { showToast(false, json.error ?? "Tạo thất bại"); return; }
      setShowCreate(false);
      showToast(true, "Tạo user thành công");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(data: Record<string, unknown>) {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { showToast(false, json.error ?? "Cập nhật thất bại"); return; }
      setEditing(null);
      showToast(true, "Cập nhật thành công");
      setUsers((prev) => prev.map((u) => u.id === editing.id ? { ...u, ...json } : u));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa user này?")) return;
    setDeleting(id);
    try {
      const res  = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { showToast(false, json.error ?? "Xóa thất bại"); return; }
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast(true, "Đã xóa user");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Users</h1>
          <p className="text-sm text-content-muted mt-1">Quản lý tài khoản và phân quyền</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-[13px] font-medium rounded-sm transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Thêm user
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-fail/10 border border-fail/20 rounded-sm text-fail text-[13px]">
          {error}
          </div>
      )}

      <div className="bg-surface-raised border border-surface-border rounded-lg shadow-soft overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_120px_100px_80px_100px] gap-4 px-5 py-2.5 border-b border-surface-border bg-surface-muted text-[11px] font-medium text-content-muted uppercase tracking-wider">
          <span>User</span>
          <span>Role</span>
          <span>Trạng thái</span>
          <span>Ngày tạo</span>
          <span className="text-right">Thao tác</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-surface-border border-t-brand rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-content-muted">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mb-3 opacity-30">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p className="text-[13px]">Chưa có user nào</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {users.map((u) => (
              <div key={u.id} className="grid grid-cols-[1fr_120px_100px_80px_100px] gap-4 px-5 py-3.5 items-center hover:bg-surface-muted/40 transition-colors">
                {/* User info */}
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-content-primary truncate">
                    {u.name || <span className="text-content-muted italic">Chưa đặt tên</span>}
                  </p>
                  <p className="text-[11px] text-content-muted truncate">{u.email}</p>
                </div>

                {/* Role */}
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-sm w-fit ${ROLE_COLORS[u.role] ?? ROLE_COLORS.user}`}>
                  {u.role}
                </span>

                {/* Status */}
                <span className={`text-[11px] px-2 py-0.5 rounded-sm w-fit ${u.isActive ? "bg-ok/15 text-ok" : "bg-surface-border text-content-muted"}`}>
                  {u.isActive ? "Active" : "Inactive"}
                </span>

                {/* Date */}
                <span className="text-[11px] text-content-muted">
                  {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                </span>

                {/* Actions */}
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => setEditing(u)}
                    className="text-[11px] px-2.5 py-1.5 border border-surface-border text-content-secondary hover:text-content-primary hover:border-content-muted rounded-sm transition-colors"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    disabled={deleting === u.id}
                    className="text-[11px] px-2.5 py-1.5 bg-fail/10 text-fail/70 hover:bg-fail/20 hover:text-fail rounded-sm disabled:opacity-40 transition-colors"
                  >
                    {deleting === u.id ? "..." : "Xóa"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title="Thêm user mới" onClose={() => setShowCreate(false)}>
          <UserForm onSubmit={handleCreate} saving={saving} roles={roles} />
        </Modal>
      )}

      {/* Edit modal */}
      {editing && (
        <Modal title={`Chỉnh sửa: ${editing.email}`} onClose={() => setEditing(null)}>
          <UserForm initial={editing} onSubmit={handleEdit} saving={saving} isEdit roles={roles} />
        </Modal>
      )}

      {/* Toast */}
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
