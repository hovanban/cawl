"use client";

import { useEffect, useRef, useState } from "react";

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
  translatedTitle: string | null;
  translatedContent: string | null;
  rewrittenTitle: string | null;
  rewrittenContent: string | null;
  rewrittenDescription: string | null;
  statusCode: number | null;
  error: string | null;
  crawledAt: string;
  job: { name: string; aiPrompt: string | null };
}

type Tab = "content" | "images" | "ai" | "translation" | "rewritten";

export function PageDetailModal({ pageId, onClose }: { pageId: string; onClose: () => void }) {
  const [page, setPage]         = useState<FullPage | null>(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>("content");
  const [sites, setSites]         = useState<PublishSite[]>([]);
  const [showSites, setShowSites] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const pickerRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/pages/${pageId}`)
      .then((r) => r.json())
      .then(setPage)
      .finally(() => setLoading(false));
    fetch("/api/sites").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setSites(d); }).catch(() => {});
  }, [pageId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowSites(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handlePublish(siteId: string) {
    setShowSites(false);
    setPublishResult(null);
    setPublishing(true);
    try {
      const res  = await fetch(`/api/pages/${pageId}/publish`, {
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
      }
    } catch (err) {
      setPublishResult({ ok: false, msg: err instanceof Error ? err.message : "Đăng thất bại" });
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const images: string[] = page?.images ? JSON.parse(page.images) : [];

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "content",     label: "Nội dung",              show: true },
    { key: "images",      label: `Hình ảnh (${images.length})`, show: images.length > 0 },
    { key: "ai",          label: "Kết quả AI",             show: !!page?.aiResult },
    { key: "translation", label: "Bản dịch",               show: !!(page?.translatedTitle || page?.translatedContent) },
    { key: "rewritten",   label: "Đã rewrite",             show: !!(page?.rewrittenTitle || page?.rewrittenContent) },
  ];

  function getYoutubeEmbed(url: string) {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-raised border border-surface-border rounded-lg shadow-card w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-surface-border shrink-0">
          <div className="min-w-0 pr-4 flex gap-3 items-start">
            {page?.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={page.thumbnail} alt=""
                className="shrink-0 w-14 h-14 object-cover rounded-md border border-surface-border bg-surface-muted"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-content-primary leading-snug line-clamp-2">
                {loading ? "Đang tải..." : (page?.title ?? "Không có tiêu đề")}
              </h2>
              {page && (
                <a href={page.url} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-brand hover:underline truncate block mt-1">
                  {page.url} ↗
                </a>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-sm text-content-muted hover:text-content-primary hover:bg-surface-muted transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Meta bar */}
        {page && (
          <div className="flex items-center gap-2.5 px-5 py-2 bg-surface-muted border-b border-surface-border text-[11px] flex-wrap shrink-0">
            <span className={`px-2 py-0.5 rounded-sm font-mono font-medium ${
              page.statusCode && page.statusCode < 400 ? "bg-ok/15 text-ok" : "bg-fail/15 text-fail"
            }`}>
              HTTP {page.statusCode ?? "ERR"}
            </span>
            <span className="text-content-muted">{new Date(page.crawledAt).toLocaleString("vi-VN")}</span>
            {page.content && <span className="text-content-muted">{page.content.length.toLocaleString()} ký tự</span>}
            {images.length > 0 && <span className="text-content-muted">{images.length} hình</span>}
            <span className="text-brand bg-brand/10 px-2 py-0.5 rounded-sm">{page.job.name}</span>
          </div>
        )}

        {/* Tabs */}
        {page && (
          <div className="flex px-5 border-b border-surface-border shrink-0">
            {tabs.filter((t) => t.show).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`py-2.5 px-3 text-[12px] font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.key
                    ? "border-brand text-brand"
                    : "border-transparent text-content-muted hover:text-content-primary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-surface-border border-t-brand rounded-full animate-spin" />
            </div>
          )}

          {page && tab === "content" && (
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
            </div>
          )}

          {page && tab === "images" && (
            <div className="p-5 space-y-5">
              {page.thumbnail && (
                <div>
                  <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-2">Thumbnail</p>
                  <div className="inline-block border border-surface-border rounded-md overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={page.thumbnail} alt="" className="h-40 w-auto object-cover bg-surface-muted"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                </div>
              )}
              {images.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-2">
                    Hình trong bài ({images.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((src, i) => (
                      <div key={i} className="border border-surface-border rounded-md overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Image ${i + 1}`}
                          className="w-full h-32 object-cover bg-surface-muted"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        <a href={src} target="_blank" rel="noopener noreferrer"
                          className="block px-2 py-1 text-[10px] text-content-muted hover:text-brand truncate border-t border-surface-border">
                          {src.split("/").pop() || src}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {page && tab === "translation" && (
            <div className="p-5 space-y-5">
              {page.translatedTitle && (
                <div>
                  <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-2">Tiêu đề đã dịch</p>
                  <p className="text-[14px] font-semibold text-content-primary bg-ok/10 border border-ok/20 rounded-sm px-4 py-3">
                    {page.translatedTitle}
                  </p>
                </div>
              )}
              {page.translatedContent && (
                <div>
                  <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-2">Nội dung đã dịch</p>
                  <div
                    className="prose-dark prose prose-sm max-w-none overflow-hidden [&_img]:!max-w-full [&_img]:rounded-sm [&_h1]:text-xl [&_h2]:text-lg [&_p]:my-1.5 [&_li]:ml-4 [&_li]:list-disc"
                    dangerouslySetInnerHTML={{ __html: page.translatedContent }}
                  />
                </div>
              )}
            </div>
          )}

          {page && tab === "rewritten" && (
            <div className="p-5 space-y-5">
              {page.rewrittenTitle && (
                <div>
                  <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-2">Tiêu đề đã rewrite</p>
                  <p className="text-[14px] font-semibold text-content-primary bg-brand/10 border border-brand/20 rounded-sm px-4 py-3 leading-snug">
                    {page.rewrittenTitle}
                  </p>
                </div>
              )}
              {page.rewrittenDescription && (
                <div>
                  <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-2">Meta description</p>
                  <p className="text-[13px] text-content-primary bg-surface-muted border border-surface-border rounded-sm px-4 py-3 leading-relaxed">
                    {page.rewrittenDescription}
                  </p>
                  <p className={`text-[11px] mt-1.5 ${
                    page.rewrittenDescription.length >= 120 && page.rewrittenDescription.length <= 160 ? "text-ok" : "text-warn"
                  }`}>
                    {page.rewrittenDescription.length} ký tự
                    {page.rewrittenDescription.length >= 120 && page.rewrittenDescription.length <= 160 ? " ✓" : " (120–160 lý tưởng)"}
                  </p>
                </div>
              )}
              {page.rewrittenContent && (
                <div>
                  <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-2">Nội dung đã rewrite</p>
                  <div
                    className="prose-dark prose prose-sm max-w-none overflow-hidden [&_img]:!max-w-full [&_img]:rounded-sm [&_h1]:text-xl [&_h2]:text-lg [&_p]:my-1.5 [&_li]:ml-4 [&_li]:list-disc [&_a]:text-brand"
                    dangerouslySetInnerHTML={{ __html: page.rewrittenContent }}
                  />
                </div>
              )}
            </div>
          )}

          {page && tab === "ai" && page.aiResult && (
            <div className="p-5 space-y-4">
              {page.job.aiPrompt && (
                <div className="px-3 py-2.5 bg-surface-muted border border-surface-border rounded-sm">
                  <p className="text-[11px] text-content-muted mb-1">Prompt:</p>
                  <p className="text-[12px] text-content-secondary italic">{page.job.aiPrompt}</p>
                </div>
              )}
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-sm p-4 text-[13px] text-content-primary leading-relaxed space-y-2">
                {page.aiResult.split(/\n/).filter((s) => s.trim()).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {publishResult && (
          <div className={`px-5 py-2.5 text-[12px] flex items-start gap-2 shrink-0 ${
            publishResult.ok ? "bg-ok/10 border-t border-ok/20 text-ok" : "bg-fail/10 border-t border-fail/20 text-fail"
          }`}>
            <svg className="shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {publishResult.ok
                ? <polyline points="20 6 9 17 4 12"/>
                : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
              }
            </svg>
            <pre className="whitespace-pre-wrap break-words font-sans flex-1">{publishResult.msg}</pre>
            <button onClick={() => setPublishResult(null)} className="shrink-0 opacity-60 hover:opacity-100">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        {page && (
          <div className="flex items-center justify-between p-4 border-t border-surface-border bg-surface-muted shrink-0">
            <a
              href={page.url} target="_blank" rel="noopener noreferrer"
              className="text-[12px] text-content-muted hover:text-brand transition-colors"
            >
              Xem trang gốc ↗
            </a>

            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setShowSites((v) => !v)}
                disabled={publishing}
                className="flex items-center gap-1.5 text-[13px] bg-brand hover:bg-brand-hover text-white px-4 py-1.5 rounded-sm disabled:opacity-40 transition-colors"
              >
                {publishing && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {publishing ? "Đang đăng..." : "Đăng bài"}
                {!publishing && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                )}
              </button>

              {showSites && (
                <div className="absolute right-0 bottom-full mb-1 z-20 bg-surface-raised border border-surface-border rounded-md shadow-card min-w-[200px] overflow-hidden">
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
                      onClick={() => handlePublish(site.id)}
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
          </div>
        )}
      </div>
    </div>
  );
}
