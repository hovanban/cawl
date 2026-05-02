"use client";

import { useEffect, useState } from "react";

interface PublishSite {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  createdAt: string;
}

const EMPTY = { name: "", apiUrl: "", apiKey: "" };

export function SiteSettings() {
  const [sites, setSites]     = useState<PublishSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/sites");
    setSites(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditId(null); setForm(EMPTY); setShowForm(true);
  }

  function openEdit(s: PublishSite) {
    setEditId(s.id);
    setForm({ name: s.name, apiUrl: s.apiUrl, apiKey: s.apiKey });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.apiUrl.trim()) return;
    setSaving(true);
    try {
      await fetch(editId ? `/api/sites/${editId}` : "/api/sites", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setEditId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá site này?")) return;
    setDeleting(id);
    await fetch(`/api/sites/${id}`, { method: "DELETE" });
    setDeleting(null);
    await load();
  }

  const inputCls = "w-full bg-surface-muted border border-surface-border rounded-sm px-3 py-2 text-[13px] text-content-primary placeholder:text-content-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-content-primary">Publish Sites</h2>
          <p className="text-[12px] text-content-muted mt-0.5">Danh sách website nhận bài đăng</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 text-[13px] bg-brand hover:bg-brand-hover text-white px-3 py-1.5 rounded-sm transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Thêm site
        </button>
      </div>

      {/* List */}
      <div className="bg-surface-raised border border-surface-border rounded-md shadow-soft overflow-hidden">
        {loading && <p className="p-6 text-[13px] text-content-muted">Đang tải...</p>}

        {!loading && sites.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-lg bg-surface-muted border border-surface-border flex items-center justify-center mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <p className="text-[13px] text-content-secondary">Chưa có site nào</p>
            <p className="text-[12px] text-content-muted mt-0.5">Thêm site để có thể đăng bài</p>
          </div>
        )}

        {sites.map((s) => (
          <div key={s.id} className="flex items-center gap-4 px-5 py-4 border-b border-surface-border last:border-0 hover:bg-surface-muted/40 transition-colors">
            <div className="w-8 h-8 rounded-sm bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-brand">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-content-primary">{s.name}</p>
              <p className="text-[11px] text-content-muted truncate mt-0.5">{s.apiUrl}</p>
              {s.apiKey && (
                <p className="text-[11px] text-content-muted mt-0.5">
                  Key: <span className="font-mono">{s.apiKey.slice(0, 8)}••••</span>
                </p>
              )}
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => openEdit(s)}
                className="text-[12px] px-2.5 py-1 border border-surface-border text-content-secondary hover:text-content-primary hover:border-content-muted rounded-sm transition-colors"
              >
                Sửa
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                disabled={deleting === s.id}
                className="text-[12px] px-2.5 py-1 border border-fail/30 text-fail hover:bg-fail/10 rounded-sm disabled:opacity-40 transition-colors"
              >
                Xoá
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-surface-raised border border-brand/30 rounded-md shadow-soft overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-border bg-surface-muted">
            <p className="text-[13px] font-medium text-content-primary">
              {editId ? "Chỉnh sửa site" : "Thêm site mới"}
            </p>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">Tên hiển thị *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Võ Thuật Việt Nam"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">API URL *</label>
              <input
                type="url"
                value={form.apiUrl}
                onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
                placeholder="https://example.com/api/posts"
                className={inputCls + " font-mono"}
              />
              <p className="text-[11px] text-content-muted mt-1.5">Endpoint nhận POST request với payload JSON</p>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">API Key / Bearer Token</label>
              <input
                type="text"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder="Để trống nếu không cần xác thực"
                className={inputCls + " font-mono"}
              />
            </div>

            {/* Payload preview */}
            <div className="px-3 py-3 bg-surface-muted border border-surface-border rounded-sm">
              <p className="text-[11px] font-medium text-content-muted mb-2">Payload sẽ gửi đi:</p>
              <pre className="text-[11px] text-content-secondary font-mono leading-relaxed">{`{
  "title":       rewrittenTitle || translatedTitle || title,
  "content":     rewrittenContent || translatedContent || content,
  "description": rewrittenDescription,
  "thumbnail":   thumbnail,
  "sourceUrl":   url gốc
}`}</pre>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => { setShowForm(false); setEditId(null); }}
                className="text-[13px] border border-surface-border text-content-secondary hover:text-content-primary px-4 py-1.5 rounded-sm transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.apiUrl.trim()}
                className="text-[13px] bg-brand hover:bg-brand-hover text-white px-4 py-1.5 rounded-sm disabled:opacity-40 transition-colors"
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
