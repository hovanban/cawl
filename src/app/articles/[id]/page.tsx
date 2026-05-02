"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface PublishSite { id: string; name: string; }

interface FullPage {
  id: string;
  url: string;
  title: string | null;
  thumbnail: string | null;
  content: string | null;
  images: string | null;
  videoUrl: string | null;
  aiResult: string | null;
  currentTitle: string | null;
  currentContent: string | null;
  currentDescription: string | null;
  statusCode: number | null;
  error: string | null;
  crawledAt: string;
  martialArt: string | null;
  authorEmail: string | null;
  job: { name: string; aiPrompt: string | null };
  publishRecords: { siteName: string; publishedAt: string }[];
}

type Tab = "original" | "current";

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [page, setPage]       = useState<FullPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<Tab>("current");

  // Publish
  const [sites, setSites]                 = useState<PublishSite[]>([]);
  const [showSites, setShowSites]         = useState(false);
  const [publishing, setPublishing]       = useState(false);
  const [publishResult, setPublishResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Delete
  const [deleting, setDeleting] = useState(false);

  // Edit (chỉ cho tab "current")
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [draft, setDraft]     = useState({ currentTitle: "", currentContent: "", currentDescription: "", martialArt: "", authorEmail: "" });

  useEffect(() => {
    fetch(`/api/pages/${id}`)
      .then((r) => r.json())
      .then((data: FullPage) => {
        setPage(data);
        setDraft({
          currentTitle:       data.currentTitle       ?? "",
          currentContent:     data.currentContent     ?? "",
          currentDescription: data.currentDescription ?? "",
          martialArt:         data.martialArt         ?? "",
          authorEmail:        data.authorEmail        ?? "",
        });
      })
      .finally(() => setLoading(false));
    fetch("/api/sites").then((r) => r.json()).then(setSites).catch(() => {});
  }, [id]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowSites(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function startEdit() {
    if (!page) return;
    setDraft({
      currentTitle:       page.currentTitle       ?? "",
      currentContent:     page.currentContent     ?? "",
      currentDescription: page.currentDescription ?? "",
      martialArt:         page.martialArt         ?? "",
      authorEmail:        page.authorEmail        ?? "",
    });
    setSaveMsg(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setSaveMsg(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMsg({ ok: false, text: data.error ?? "Lưu thất bại" });
      } else {
        setPage((prev) => prev ? { ...prev, ...draft } : prev);
        setEditing(false);
        setSaveMsg({ ok: true, text: "Đã lưu thành công" });
        setTimeout(() => setSaveMsg(null), 3000);
      }
    } catch (err) {
      setSaveMsg({ ok: false, text: err instanceof Error ? err.message : "Lỗi kết nối" });
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(siteId: string) {
    setShowSites(false);
    setPublishResult(null);
    setPublishing(true);
    try {
      const res  = await fetch(`/api/pages/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail ? `\n${JSON.stringify(data.detail, null, 2)}` : "";
        setPublishResult({ ok: false, msg: (data.error ?? "Đăng thất bại") + detail });
      } else {
        setPublishResult({ ok: true, msg: "Đăng bài thành công!" });
        setTimeout(() => setPublishResult(null), 4000);
        const siteName = sites.find((s) => s.id === siteId)?.name ?? "";
        setPage((prev) => prev ? {
          ...prev,
          publishRecords: [{ siteName, publishedAt: new Date().toISOString() }, ...prev.publishRecords],
        } : prev);
      }
    } catch (err) {
      setPublishResult({ ok: false, msg: err instanceof Error ? err.message : "Đăng thất bại" });
    } finally {
      setPublishing(false);
    }
  }

  const images: string[] = page?.images ? JSON.parse(page.images) : [];

  function getYoutubeEmbed(url: string) {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  }

  const hasCurrentVersion = !!(page?.currentTitle || page?.currentContent || page?.currentDescription);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-[13px] text-content-muted hover:text-content-primary transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        Quay lại danh sách
      </button>

      {loading ? (
        <div className="bg-surface-raised border border-surface-border rounded-lg p-8 flex justify-center">
          <div className="w-8 h-8 border-2 border-surface-border border-t-brand rounded-full animate-spin" />
        </div>
      ) : !page ? (
        <div className="bg-surface-raised border border-surface-border rounded-lg p-12 text-center text-content-muted">
          Bài viết không tồn tại.
        </div>
      ) : (
        <div className="bg-surface-raised border border-surface-border rounded-lg shadow-soft overflow-hidden">

          {/* Header */}
          <div className="p-5 border-b border-surface-border">
            <div className="flex gap-4 items-start">
              {page.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.thumbnail} alt=""
                  className="shrink-0 w-20 h-20 object-cover rounded-md border border-surface-border bg-surface-muted"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-[17px] font-semibold text-content-primary leading-snug">
                  {page.currentTitle || page.title || <span className="text-content-muted italic">Không có tiêu đề</span>}
                </h1>
                {page.currentTitle && page.currentTitle !== page.title && (
                  <p className="text-[11px] text-content-muted mt-1 line-clamp-1">Gốc: {page.title}</p>
                )}
                <a href={page.url} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-content-muted hover:text-brand truncate block mt-1.5 transition-colors">
                  {page.url} ↗
                </a>
              </div>
            </div>
          </div>

          {/* Meta bar */}
          <div className="flex items-center gap-2.5 px-5 py-2.5 bg-surface-muted border-b border-surface-border text-[11px] flex-wrap">
            <span className={`px-2 py-0.5 rounded-sm font-mono font-medium ${
              page.statusCode && page.statusCode < 400 ? "bg-ok/15 text-ok" : "bg-fail/15 text-fail"
            }`}>
              HTTP {page.statusCode ?? "ERR"}
            </span>
            <span className="text-content-muted">{new Date(page.crawledAt).toLocaleString("vi-VN")}</span>
            {page.content && <span className="text-content-muted">{page.content.length.toLocaleString()} ký tự</span>}
            <span className="text-brand bg-brand/10 px-2 py-0.5 rounded-sm">{page.job.name}</span>
            {page.martialArt && <span className="text-content-muted bg-surface-border px-2 py-0.5 rounded-sm">{page.martialArt}</span>}
            {page.authorEmail && <span className="text-content-muted">{page.authorEmail}</span>}
          </div>

          {/* Tabs + Edit button */}
          <div className="flex items-center border-b border-surface-border">
            <div className="flex px-5">
              {([
                { key: "original" as Tab, label: "Bản gốc" },
                { key: "current"  as Tab, label: hasCurrentVersion ? "Bản hiện tại" : "Bản hiện tại (chưa có)" },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setEditing(false); setSaveMsg(null); }}
                  className={`py-2.5 px-3 text-[12px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                    tab === t.key
                      ? "border-brand text-brand"
                      : "border-transparent text-content-muted hover:text-content-primary"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {tab === "current" && !editing && (
              <button
                onClick={startEdit}
                className="ml-auto shrink-0 flex items-center gap-1.5 text-[12px] text-content-muted hover:text-content-primary px-4 py-3 hover:bg-surface-muted border-l border-surface-border transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Chỉnh sửa
              </button>
            )}
          </div>

          {/* Save message */}
          {saveMsg && (
            <div className={`px-5 py-2 text-[12px] flex items-center gap-2 ${
              saveMsg.ok ? "bg-ok/10 border-b border-ok/20 text-ok" : "bg-fail/10 border-b border-fail/20 text-fail"
            }`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {saveMsg.ok ? <polyline points="20 6 9 17 4 12"/> : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
              </svg>
              {saveMsg.text}
            </div>
          )}

          {/* Body */}
          <div className="min-h-[400px]">

            {/* ── BẢN GỐC ── */}
            {tab === "original" && (
              <div className="p-5 space-y-4">
                {page.error && (
                  <div className="flex items-start gap-2 px-4 py-3 bg-fail/10 border border-fail/20 rounded-sm text-fail text-[12px]">
                    <svg className="shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {page.error}
                  </div>
                )}
                {page.videoUrl && (
                  <div className="rounded-md overflow-hidden bg-black">
                    {getYoutubeEmbed(page.videoUrl) ? (
                      <iframe src={getYoutubeEmbed(page.videoUrl)!} className="w-full aspect-video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    ) : (
                      <video src={page.videoUrl} controls className="w-full aspect-video" />
                    )}
                  </div>
                )}
                {page.title && (
                  <h2 className="text-[15px] font-semibold text-content-primary">{page.title}</h2>
                )}
                {page.content ? (
                  <div
                    className="prose-dark prose prose-sm max-w-none overflow-hidden
                      [&_img]:!relative [&_img]:!max-w-full [&_img]:!w-auto [&_img]:!h-auto [&_img]:rounded-sm [&_img]:my-2
                      [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base
                      [&_p]:my-1.5 [&_li]:ml-4 [&_li]:list-disc [&_a]:text-brand"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                  />
                ) : (
                  <p className="text-content-muted text-[13px]">Không có nội dung.</p>
                )}
                {images.length > 0 && (
                  <div className="pt-4 border-t border-surface-border">
                    <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-3">Hình ảnh ({images.length})</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {images.map((src, i) => (
                        <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" className="w-full h-20 object-cover rounded-sm border border-surface-border bg-surface-muted"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── BẢN HIỆN TẠI ── */}
            {tab === "current" && (
              editing ? (
                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">Môn võ</label>
                      <input
                        type="text"
                        value={draft.martialArt}
                        onChange={(e) => setDraft((d) => ({ ...d, martialArt: e.target.value }))}
                        className="w-full px-3 py-2 bg-surface-muted border border-surface-border rounded-sm text-[13px] text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
                        placeholder="Ví dụ: Võ cổ truyền..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">Email tác giả</label>
                      <input
                        type="email"
                        value={draft.authorEmail}
                        onChange={(e) => setDraft((d) => ({ ...d, authorEmail: e.target.value }))}
                        className="w-full px-3 py-2 bg-surface-muted border border-surface-border rounded-sm text-[13px] text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
                        placeholder="author@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">Tiêu đề</label>
                    <input
                      type="text"
                      value={draft.currentTitle}
                      onChange={(e) => setDraft((d) => ({ ...d, currentTitle: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-surface-muted border border-surface-border rounded-sm text-[14px] font-semibold text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
                      placeholder="Tiêu đề bài viết..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">
                      Meta description
                      <span className={`ml-2 normal-case font-normal ${
                        draft.currentDescription.length >= 120 && draft.currentDescription.length <= 160 ? "text-ok" : "text-content-muted"
                      }`}>
                        {draft.currentDescription.length} ký tự {draft.currentDescription.length >= 120 && draft.currentDescription.length <= 160 ? "✓" : "(120–160 lý tưởng)"}
                      </span>
                    </label>
                    <textarea
                      value={draft.currentDescription}
                      onChange={(e) => setDraft((d) => ({ ...d, currentDescription: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2.5 bg-surface-muted border border-surface-border rounded-sm text-[13px] text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors resize-y"
                      placeholder="Mô tả ngắn..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">
                      Nội dung (HTML)
                      <span className="ml-2 normal-case font-normal text-content-muted">{draft.currentContent.length.toLocaleString()} ký tự</span>
                    </label>
                    <textarea
                      value={draft.currentContent}
                      onChange={(e) => setDraft((d) => ({ ...d, currentContent: e.target.value }))}
                      rows={24}
                      className="w-full px-3 py-2.5 bg-surface-muted border border-surface-border rounded-sm text-[12px] font-mono text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors resize-y"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t border-surface-border">
                    <button onClick={handleSave} disabled={saving}
                      className="flex items-center gap-2 px-5 py-2 bg-brand hover:bg-brand-hover text-white text-[13px] rounded-sm disabled:opacity-40 transition-colors">
                      {saving && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {saving ? "Đang lưu..." : "Lưu"}
                    </button>
                    <button onClick={cancelEdit} disabled={saving}
                      className="px-4 py-2 text-[13px] border border-surface-border text-content-secondary hover:text-content-primary rounded-sm disabled:opacity-40 transition-colors">
                      Hủy
                    </button>
                  </div>
                </div>
              ) : hasCurrentVersion ? (
                <div className="p-5 space-y-5">
                  {page.currentTitle && (
                    <div>
                      <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-2">Tiêu đề</p>
                      <p className="text-[15px] font-semibold text-content-primary bg-brand/10 border border-brand/20 rounded-sm px-4 py-3 leading-snug">
                        {page.currentTitle}
                      </p>
                    </div>
                  )}
                  {page.currentDescription && (
                    <div>
                      <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-2">
                        Meta description
                        <span className={`ml-2 normal-case font-normal ${
                          page.currentDescription.length >= 120 && page.currentDescription.length <= 160 ? "text-ok" : "text-warn"
                        }`}>
                          {page.currentDescription.length} ký tự {page.currentDescription.length >= 120 && page.currentDescription.length <= 160 ? "✓" : "(120–160 lý tưởng)"}
                        </span>
                      </p>
                      <p className="text-[13px] text-content-primary bg-surface-muted border border-surface-border rounded-sm px-4 py-3 leading-relaxed">
                        {page.currentDescription}
                      </p>
                    </div>
                  )}
                  {page.currentContent && (
                    <div>
                      <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-2">Nội dung</p>
                      <div
                        className="prose-dark prose prose-sm max-w-none overflow-hidden [&_img]:!max-w-full [&_img]:rounded-sm [&_h1]:text-xl [&_h2]:text-lg [&_p]:my-1.5 [&_li]:ml-4 [&_li]:list-disc [&_a]:text-brand"
                        dangerouslySetInnerHTML={{ __html: page.currentContent }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center text-content-muted gap-3">
                  <p className="text-[13px]">Chưa có bản hiện tại.</p>
                  <p className="text-[12px]">Dùng nút <strong>Dịch</strong> hoặc <strong>AI Rewrite</strong> trong danh sách bài viết, hoặc nhấn chỉnh sửa để nhập tay.</p>
                  <button onClick={startEdit} className="mt-1 text-[12px] text-brand hover:underline">
                    Nhập tay →
                  </button>
                </div>
              )
            )}
          </div>

          {/* Publish result */}
          {publishResult && (
            <div className={`px-5 py-2.5 text-[12px] flex items-start gap-2 ${
              publishResult.ok ? "bg-ok/10 border-t border-ok/20 text-ok" : "bg-fail/10 border-t border-fail/20 text-fail"
            }`}>
              <svg className="shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {publishResult.ok ? <polyline points="20 6 9 17 4 12"/> : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
              </svg>
              <pre className="whitespace-pre-wrap break-words font-sans flex-1">{publishResult.msg}</pre>
              <button onClick={() => setPublishResult(null)} className="shrink-0 opacity-60 hover:opacity-100">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}

          {/* Publish history */}
          {page.publishRecords.length > 0 && (
            <div className="px-5 py-2.5 border-t border-surface-border bg-surface-muted flex flex-wrap gap-2 items-center">
              <span className="text-[11px] text-content-muted">Đã đăng lên:</span>
              {page.publishRecords.map((r, i) => (
                <span key={i} className="text-[11px] bg-ok/15 text-ok px-2 py-0.5 rounded-sm">
                  ✓ {r.siteName} — {new Date(r.publishedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-surface-border bg-surface-muted">
            <div className="flex items-center gap-3">
              <a href={page.url} target="_blank" rel="noopener noreferrer"
                className="text-[12px] text-content-muted hover:text-brand transition-colors">
                Xem trang gốc ↗
              </a>
              <button
                onClick={async () => {
                  if (!confirm("Xóa bài viết này?")) return;
                  setDeleting(true);
                  try {
                    await fetch(`/api/pages/${id}`, { method: "DELETE" });
                    router.push("/articles");
                  } catch {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="flex items-center gap-1 text-[12px] text-fail/70 hover:text-fail disabled:opacity-40 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
                {deleting ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setShowSites((v) => !v)}
                disabled={publishing}
                className="flex items-center gap-1.5 text-[13px] bg-brand hover:bg-brand-hover text-white px-4 py-1.5 rounded-sm disabled:opacity-40 transition-colors"
              >
                {publishing && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {publishing ? "Đang đăng..." : "Đăng bài"}
                {!publishing && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>}
              </button>
              {showSites && (
                <div className="absolute right-0 bottom-full mb-1 z-20 bg-surface-raised border border-surface-border rounded-md shadow-card min-w-[200px] overflow-hidden">
                  <p className="px-3 py-2 text-[11px] font-medium text-content-muted uppercase tracking-wider border-b border-surface-border">Chọn site đăng</p>
                  {sites.length === 0 ? (
                    <div className="px-3 py-3 text-[12px] text-content-muted text-center">
                      Chưa có site nào.{" "}
                      <a href="/settings" className="text-brand hover:underline">Thêm tại Settings</a>
                    </div>
                  ) : sites.map((site) => (
                    <button key={site.id} onClick={() => handlePublish(site.id)}
                      className="w-full text-left px-3 py-2.5 text-[13px] text-content-primary hover:bg-surface-muted transition-colors flex items-center gap-2">
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
          </div>
        </div>
      )}
    </div>
  );
}
