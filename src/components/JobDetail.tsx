"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PreviewCrawl } from "./PreviewCrawl";
import { PageDetailModal } from "./PageDetailModal";

interface Page {
  id: string;
  url: string;
  title: string | null;
  thumbnail: string | null;
  content: string | null;
  aiResult: string | null;
  statusCode: number | null;
  error: string | null;
  crawledAt: string;
}

interface Run {
  id: string;
  status: string;
  pagesProcessed: number;
  pagesFound: number;
  errors: number;
  startedAt: string;
  finishedAt: string | null;
}

interface Job {
  id: string;
  name: string;
  startUrl: string;
  maxDepth: number;
  limitPosts: number;
  rateLimit: number;
  concurrency: number;
  schedule: string | null;
  aiEnabled: boolean;
  status: string;
  detailLinkSelector: string | null;
  titleSelector: string | null;
  contentSelector: string | null;
  removeElementSelector: string | null;
  _count: { pages: number; runs: number };
  runs: Run[];
  pages: Page[];
}

const STATUS_STYLE: Record<string, string> = {
  IDLE:      "bg-surface-border text-content-muted",
  RUNNING:   "bg-brand/15 text-brand",
  COMPLETED: "bg-ok/15 text-ok",
  FAILED:    "bg-fail/15 text-fail",
};
const STATUS_DOT: Record<string, string> = {
  IDLE:      "bg-content-muted",
  RUNNING:   "bg-brand animate-pulse",
  COMPLETED: "bg-ok",
  FAILED:    "bg-fail",
};

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[13px] font-medium text-content-primary">{value}</p>
    </div>
  );
}

export function JobDetail({ jobId }: { jobId: string }) {
  const [job, setJob]             = useState<Job | null>(null);
  const [loading, setLoading]     = useState(true);
  const [running, setRunning]     = useState(false);
  const [modalPageId, setModalPageId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const fetchJob = useCallback(() => {
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then(setJob)
      .finally(() => setLoading(false));
  }, [jobId]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  useEffect(() => {
    if (job?.status !== "RUNNING") return;
    const interval = setInterval(fetchJob, 3000);
    return () => clearInterval(interval);
  }, [job?.status, fetchJob]);

  async function handleRun() {
    setRunning(true);
    await fetch(`/api/jobs/${jobId}/run`, { method: "POST" });
    setRunning(false);
    fetchJob();
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-surface-raised rounded" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-surface-raised border border-surface-border rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-fail/10 border border-fail/20 rounded-md text-fail text-sm">
        Job not found.
      </div>
    );
  }

  const isRunning = running || job.status === "RUNNING";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[job.status] ?? "bg-content-muted"}`} />
            <h1 className="text-xl font-semibold text-content-primary truncate">{job.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-sm text-[11px] font-medium ${STATUS_STYLE[job.status] ?? ""}`}>
              {job.status}
            </span>
          </div>
          <a
            href={job.startUrl} target="_blank" rel="noopener noreferrer"
            className="text-[12px] text-content-muted hover:text-brand transition-colors truncate inline-block max-w-lg"
          >
            {job.startUrl} ↗
          </a>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowPreview((p) => !p)}
            className="text-[13px] px-3 py-1.5 border border-surface-border text-content-secondary hover:text-content-primary hover:border-content-muted rounded-sm transition-colors"
          >
            Preview
          </button>
          <Link
            href={`/jobs/${job.id}/edit`}
            className="text-[13px] px-3 py-1.5 border border-surface-border text-content-secondary hover:text-content-primary hover:border-content-muted rounded-sm transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="text-[13px] px-4 py-1.5 bg-brand hover:bg-brand-hover text-white rounded-sm disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isRunning && (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {isRunning ? "Running..." : "Run Now"}
          </button>
        </div>
      </div>

      {showPreview && <PreviewCrawl url={job.startUrl} jobId={job.id} />}

      {/* Config grid */}
      <div className="bg-surface-raised border border-surface-border rounded-md p-5 shadow-soft grid grid-cols-2 md:grid-cols-4 gap-5">
        <MetaItem label="Max Depth"    value={`${job.maxDepth} trang`} />
        <MetaItem label="Limit Posts"  value={`${job.limitPosts} bài`} />
        <MetaItem label="Rate Limit"   value={`${job.rateLimit}ms`} />
        <MetaItem label="Concurrency"  value={job.concurrency} />
        <MetaItem label="Pages Crawled" value={job._count.pages.toLocaleString()} />
        <MetaItem label="Total Runs"   value={job._count.runs} />
        <MetaItem label="AI"           value={job.aiEnabled ? <span className="text-purple-400">Bật</span> : "Tắt"} />
        <MetaItem label="Schedule"     value={job.schedule ?? "Manual"} />
      </div>

      {/* Selectors */}
      {(job.detailLinkSelector || job.contentSelector) && (
        <div className="bg-surface-raised border border-surface-border rounded-md p-5 shadow-soft">
          <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-4">Selectors</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: "Link bài viết",    value: job.detailLinkSelector },
              { label: "Tiêu đề (listing)", value: job.titleSelector },
              { label: "Content (detail)",  value: job.contentSelector },
              { label: "Remove",            value: job.removeElementSelector },
            ].filter((s) => s.value).map((s) => (
              <div key={s.label}>
                <p className="text-[11px] text-content-muted mb-1">{s.label}</p>
                <code className="block text-[11px] font-mono text-brand bg-surface-muted border border-surface-border rounded-sm px-3 py-1.5 truncate">
                  {s.value}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent runs */}
      {job.runs.length > 0 && (
        <div className="bg-surface-raised border border-surface-border rounded-md shadow-soft overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-border">
            <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider">Recent Runs</p>
          </div>
          <div className="divide-y divide-surface-border">
            {job.runs.map((run) => {
              const duration = run.finishedAt
                ? Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
                : null;
              return (
                <div key={run.id} className="flex items-center justify-between px-5 py-3 text-[12px] hover:bg-surface-muted/40 transition-colors">
                  <span className="text-content-muted">
                    {new Date(run.startedAt).toLocaleString("vi-VN")}
                    {duration !== null && <span className="ml-2 text-content-muted">· {duration}s</span>}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-content-secondary tabular-nums">{run.pagesFound} found</span>
                    <span className="text-content-secondary tabular-nums">{run.pagesProcessed} crawled</span>
                    {run.errors > 0 && <span className="text-fail">{run.errors} errors</span>}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-medium ${STATUS_STYLE[run.status] ?? ""}`}>
                      <span className={`w-1 h-1 rounded-full ${STATUS_DOT[run.status] ?? ""}`} />
                      {run.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Articles */}
      <div className="bg-surface-raised border border-surface-border rounded-md shadow-soft overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between">
          <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider">
            Bài viết đã crawl
          </p>
          <span className="text-[11px] text-content-muted">
            {Math.min(job.pages.length, 50)} / {job._count.pages.toLocaleString()}
          </span>
        </div>

        {job.pages.length === 0 ? (
          <div className="px-5 py-12 text-center text-content-muted text-[13px]">
            Chưa có bài viết nào. Chạy job để bắt đầu crawl.
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {job.pages.map((page) => (
              <div key={page.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-muted/40 transition-colors group">
                {page.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={page.thumbnail} alt=""
                    className="shrink-0 w-12 h-9 object-cover rounded-sm border border-surface-border bg-surface-muted"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="shrink-0 w-12 h-9 rounded-sm border border-dashed border-surface-border bg-surface-muted flex items-center justify-center">
                    <span className="text-content-muted text-[10px]">–</span>
                  </div>
                )}

                <span className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${
                  page.statusCode && page.statusCode < 400
                    ? "bg-ok/15 text-ok"
                    : "bg-fail/15 text-fail"
                }`}>
                  {page.statusCode ?? "ERR"}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-content-primary truncate">{page.title ?? <span className="text-content-muted italic">No title</span>}</p>
                  <p className="text-[11px] text-content-muted truncate mt-0.5">{page.url}</p>
                </div>

                {page.aiResult && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-sm bg-purple-500/15 text-purple-400">AI</span>
                )}

                <button
                  onClick={() => setModalPageId(page.id)}
                  className="shrink-0 text-[12px] px-2.5 py-1 border border-surface-border text-content-muted hover:text-content-primary hover:border-content-muted rounded-sm transition-colors opacity-0 group-hover:opacity-100"
                >
                  Xem
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalPageId && (
        <PageDetailModal pageId={modalPageId} onClose={() => setModalPageId(null)} />
      )}
    </div>
  );
}
