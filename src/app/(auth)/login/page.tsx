"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const from         = searchParams.get("from") ?? "/";

  const [email,    setEmail]    = useState("hovanban7@gmail.com");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Đăng nhập thất bại"); return; }
      router.push(from);
      router.refresh();
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm px-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center shadow-soft">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </div>
          <span className="font-semibold text-[20px] text-content-primary tracking-tight">Cawl</span>
        </div>

        <div className="bg-surface-raised border border-surface-border rounded-lg shadow-card p-6">
          <h1 className="text-[16px] font-semibold text-content-primary mb-1">Đăng nhập</h1>
          <p className="text-[12px] text-content-muted mb-6">Nhập thông tin tài khoản để tiếp tục</p>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 mb-4 bg-fail/10 border border-fail/20 rounded-sm text-fail text-[12px]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-muted border border-surface-border rounded-sm text-[13px] text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">Mật khẩu</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-muted border border-surface-border rounded-sm text-[13px] text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand hover:bg-brand-hover text-white text-[13px] font-medium rounded-sm disabled:opacity-40 transition-colors"
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
        </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
