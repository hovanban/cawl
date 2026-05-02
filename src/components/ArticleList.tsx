"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AiPreviewModal } from "./AiPreviewModal";

interface Job { id: string; name: string; }
interface PublishSite { id: string; name: string; apiUrl: string; }

interface PublishRecordRow { siteName: string; publishedAt: string; }

interface PageRow {
  id: string;
  url: string;
  title: string | null;
  thumbnail: string | null;
  statusCode: number | null;
  error: string | null;
  crawledAt: string;
  aiResult: string | null;
  currentTitle: string | null;
  jobId: string;
  job: { name: string };
  publishRecords: PublishRecordRow[];
}

interface PagedResult {
  pages: PageRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="shrink-0 w-16 h-16 rounded-md bg-surface-border" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/4 bg-surface-border rounded" />
        <div className="h-3 w-1/2 bg-surface-border rounded" />
        <div className="h-3 w-1/4 bg-surface-border rounded" />
      </div>
    </div>
  );
}

export function ArticleList() {
  const [result, setResult]     = useState<PagedResult | null>(null);
  const [jobs, setJobs]         = useState<Job[]>([]);
  const [sites, setSites]       = useState<PublishSite[]>([]);
  const [loading, setLoading]   = useState(true);
  const [q, setQ]               = useState("");
  const [jobId, setJobId]       = useState("");
  const [page, setPage]         = useState(1);
  const [aiPreview, setAiPreview]     = useState<{ id: string; title: string | null } | null>(null);
  const [translating, setTranslating] = useState<Set<string>>(new Set());
  const [deleting, setDeleting]       = useState<Set<string>>(new Set());
  const [publishing, setPublishing]   = useState<Set<string>>(new Set());
  const [publishPicker, setPublishPicker] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<{ pageId: string; ok: boolean; msg: string } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const limit = 20;

  useEffect(() => {
    fetch("/api/jobs").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setJobs(d); }).catch(() => {});
    fetch("/api/sites").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setSites(d); }).catch(() => {});
  }, []);

  // Đóng picker khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPublishPicker(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q)     params.set("q", q);
    if (jobId) params.set("jobId", jobId);
    try {
      const res  = await fetch(`/api/pages?${params}`);
      const data: PagedResult = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, [page, q, jobId]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(val: string) { setQ(val);     setPage(1); }
  function handleJob(val: string)    { setJobId(val); setPage(1); }

  async function handlePublish(pageId: string, siteId: string) {
    setPublishPicker(null);
    setPublishResult(null);
    setPublishing((prev) => new Set(prev).add(pageId));
    try {
      const res  = await fetch(`/api/pages/${pageId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail ? `\n${JSON.stringify(data.detail, null, 2)}` : "";
        setPublishResult({ pageId, ok: false, msg: (data.error ?? "Đăng thất bại") + detail });
      } else {
        setPublishResult({ pageId, ok: true, msg: "Đăng bài thành công!" });
        setTimeout(() => setPublishResult(null), 4000);
        // Cập nhật badge ngay
        const siteName = sites.find((s) => s.id === siteId)?.name ?? "";
        setResult((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            pages: prev.pages.map((p) =>
              p.id === pageId
                ? { ...p, publishRecords: [{ siteName, publishedAt: new Date().toISOString() }, ...p.publishRecords] }
                : p
            ),
          };
        });
      }
    } catch (err) {
      setPublishResult({ pageId, ok: false, msg: err instanceof Error ? err.message : "Đăng thất bại" });
    } finally {
      setPublishing((prev) => { const n = new Set(prev); n.delete(pageId); return n; });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa bài viết này?")) return;
    setDeleting((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/pages/${id}`, { method: "DELETE" });
      setResult((prev) => {
        if (!prev) return prev;
        return { ...prev, pages: prev.pages.filter((p) => p.id !== id), total: prev.total - 1 };
      });
    } finally {
      setDeleting((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  async function handleTranslate(id: string) {
    setTranslating((prev) => new Set(prev).add(id));
    try {
      const res  = await fetch(`/api/pages/${id}/translate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Dịch thất bại"); return; }
      setResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pages: prev.pages.map((p) =>
            p.id === id ? { ...p, currentTitle: data.currentTitle } : p
          ),
        };
      });
    } finally {
      setTranslating((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  const total      = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            placeholder="Tìm tiêu đề, URL..."
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-raised border border-surface-border rounded-sm text-[13px] text-content-primary placeholder:text-content-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
          />
        </div>
        <select
          value={jobId}
          onChange={(e) => handleJob(e.target.value)}
          className="bg-surface-raised border border-surface-border rounded-sm px-3 py-2 text-[13px] text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
        >
          <option value="">Tất cả jobs</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>{j.name}</option>
          ))}
        </select>
        <button
          onClick={load}
          className="px-4 py-2 text-[13px] bg-surface-raised border border-surface-border text-content-secondary hover:text-content-primary hover:border-content-muted rounded-sm transition-colors"
        >
          Làm mới
        </button>
      </div>

      {/* Count bar */}
      <div className="flex items-center justify-between text-[12px] text-content-muted px-0.5">
        <span>{loading ? "Đang tải..." : `${total.toLocaleString()} bài viết`}</span>
        {totalPages > 1 && <span>Trang {page} / {totalPages}</span>}
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-surface-raised border border-surface-border rounded-md shadow-soft overflow-hidden divide-y divide-surface-border">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : result?.pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-4xl mb-3 opacity-30">📄</div>
          <p className="text-content-secondary text-sm">Chưa có bài viết nào</p>
          <p className="text-content-muted text-[12px] mt-1">Chạy một job crawl để bắt đầu thu thập</p>
        </div>
      ) : (
        <div className="bg-surface-raised border border-surface-border rounded-md shadow-soft overflow-hidden divide-y divide-surface-border">
          {result!.pages.map((p) => (
            <div
              key={p.id}
              className="flex items-start gap-3 px-4 py-3 hover:bg-surface-muted/40 transition-colors group"
            >
              {/* Thumbnail */}
              <div className="shrink-0 w-16 h-16 rounded-md overflow-hidden bg-surface-muted border border-surface-border">
                {p.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumbnail} alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-content-muted text-lg opacity-30">📄</div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <a
                  href={`/articles/${p.id}`}
                  className="text-[13px] font-medium text-content-primary line-clamp-2 leading-snug hover:text-brand transition-colors"
                >
                  {p.title ?? <span className="text-content-muted italic">Không có tiêu đề</span>}
                </a>
                <p className="text-[11px] text-content-muted truncate mt-0.5">{p.url}</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] text-brand bg-brand/10 px-2 py-0.5 rounded-sm">{p.job.name}</span>
                  <span className="text-[11px] text-content-muted">
                    {new Date(p.crawledAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {p.statusCode && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${p.statusCode < 400 ? "bg-ok/15 text-ok" : "bg-fail/15 text-fail"}`}>
                      {p.statusCode}
                    </span>
                  )}
                  {p.aiResult && (
                    <span className="text-[10px] bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded-sm">AI</span>
                  )}
                  {p.currentTitle && (
                    <span className="text-[10px] bg-brand/15 text-brand px-1.5 py-0.5 rounded-sm">Đã xử lý</span>
                  )}
                  {p.publishRecords.length > 0 && (
                    <span
                      title={p.publishRecords.map((r) => `${r.siteName} — ${new Date(r.publishedAt).toLocaleDateString("vi-VN")}`).join("\n")}
                      className="text-[10px] bg-ok/15 text-ok px-1.5 py-0.5 rounded-sm cursor-default"
                    >
                      ✓ {p.publishRecords.length === 1 ? p.publishRecords[0].siteName : `Đã đăng ${p.publishRecords.length} site`}
                    </span>
                  )}
                  {p.error && (
                    <span className="text-[10px] bg-fail/15 text-fail px-1.5 py-0.5 rounded-sm">Lỗi</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="shrink-0 self-center flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleTranslate(p.id)}
                  disabled={translating.has(p.id)}
                  title="Dịch bằng DeepL"
                  className="text-[11px] px-2.5 py-1.5 bg-ok/15 text-ok hover:bg-ok/25 rounded-sm disabled:opacity-40 transition-colors"
                >
                  {translating.has(p.id) ? "..." : "Dịch"}
                </button>
                <button
                  onClick={() => setAiPreview({ id: p.id, title: p.title })}
                  title="AI Rewrite"
                  className="text-[11px] px-2.5 py-1.5 bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 rounded-sm transition-colors"
                >
                  AI
                </button>

                {/* Nút Đăng + site picker */}
                <div className="relative">
                  <button
                    onClick={() => setPublishPicker(publishPicker === p.id ? null : p.id)}
                    disabled={publishing.has(p.id)}
                    title="Đăng bài lên site"
                    className="text-[11px] px-2.5 py-1.5 bg-brand/15 text-brand hover:bg-brand/25 rounded-sm disabled:opacity-40 transition-colors"
                  >
                    {publishing.has(p.id) ? "..." : "Đăng"}
                  </button>

                  {publishPicker === p.id && (
                    <div
                      ref={pickerRef}
                      className="absolute right-0 top-full mt-1 z-20 bg-surface-raised border border-surface-border rounded-md shadow-card min-w-[180px] overflow-hidden"
                    >
                      <p className="px-3 py-2 text-[11px] font-medium text-content-muted uppercase tracking-wider border-b border-surface-border">
                        Chọn site đăng
                      </p>
                      {sites.length === 0 ? (
                        <div className="px-3 py-3 text-[12px] text-content-muted text-center">
                          Chưa có site nào.{" "}
                          <a href="/settings" className="text-brand hover:underline">Thêm tại Settings</a>
                        </div>
                      ) : sites.map((site) => (
                        <button
                          key={site.id}
                          onClick={() => handlePublish(p.id, site.id)}
                          className="w-full text-left px-3 py-2.5 text-[13px] text-content-primary hover:bg-surface-muted transition-colors flex items-center gap-2"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-brand shrink-0">
                            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                          </svg>
                          {site.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <a
                  href={`/articles/${p.id}`}
                  title="Xem nội dung"
                  className="text-[11px] px-2.5 py-1.5 bg-surface-border text-content-secondary hover:text-content-primary hover:bg-surface-border/70 rounded-sm transition-colors"
                >
                  Xem
                </a>
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={deleting.has(p.id)}
                  title="Xóa bài viết"
                  className="text-[11px] px-2.5 py-1.5 bg-fail/10 text-fail/70 hover:bg-fail/20 hover:text-fail rounded-sm disabled:opacity-40 transition-colors"
                >
                  {deleting.has(p.id) ? "..." : "Xóa"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1.5 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-[12px] border border-surface-border text-content-secondary hover:text-content-primary hover:border-content-muted rounded-sm disabled:opacity-30 transition-colors"
          >
            ← Trước
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let num: number;
            if (totalPages <= 7)          num = i + 1;
            else if (page <= 4)           num = i + 1;
            else if (page >= totalPages - 3) num = totalPages - 6 + i;
            else                          num = page - 3 + i;
            return (
              <button
                key={num}
                onClick={() => setPage(num)}
                className={`w-8 h-8 text-[12px] rounded-sm transition-colors ${
                  num === page
                    ? "bg-brand text-white"
                    : "border border-surface-border text-content-secondary hover:text-content-primary hover:border-content-muted"
                }`}
              >
                {num}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-[12px] border border-surface-border text-content-secondary hover:text-content-primary hover:border-content-muted rounded-sm disabled:opacity-30 transition-colors"
          >
            Tiếp →
          </button>
        </div>
      )}

      {/* Publish result toast */}
      {publishResult && (
        <div className={`fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-md shadow-card border text-[13px] flex items-start gap-3 ${
          publishResult.ok
            ? "bg-ok/10 border-ok/30 text-ok"
            : "bg-fail/10 border-fail/30 text-fail"
        }`}>
          <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {publishResult.ok
              ? <><polyline points="20 6 9 17 4 12"/></>
              : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
            }
          </svg>
          <div className="flex-1 min-w-0">
            <pre className="whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed">{publishResult.msg}</pre>
          </div>
          <button onClick={() => setPublishResult(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {aiPreview && (
        <AiPreviewModal
          pageId={aiPreview.id}
          pageTitle={aiPreview.title}
          onClose={() => setAiPreview(null)}
          onApplied={() => {
            setResult((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                pages: prev.pages.map((p) =>
                  p.id === aiPreview.id ? { ...p, currentTitle: "1" } : p
                ),
              };
            });
          }}
        />
      )}
    </div>
  );
}
