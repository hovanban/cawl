"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalJobs: number;
  totalPages: number;
  totalRuns: number;
  pagesWithAI: number;
  jobsByStatus: Record<string, number>;
  recentRuns: Array<{
    id: string;
    status: string;
    pagesProcessed: number;
    startedAt: string;
    finishedAt: string | null;
    job: { name: string };
  }>;
}

const STATUS_STYLE: Record<string, string> = {
  RUNNING:   "bg-brand/15 text-brand",
  COMPLETED: "bg-ok/15 text-ok",
  FAILED:    "bg-fail/15 text-fail",
  CANCELLED: "bg-surface-raised text-content-muted",
  IDLE:      "bg-surface-raised text-content-muted",
};

const STATUS_DOT: Record<string, string> = {
  RUNNING:   "bg-brand animate-pulse",
  COMPLETED: "bg-ok",
  FAILED:    "bg-fail",
  CANCELLED: "bg-content-muted",
  IDLE:      "bg-content-muted",
};

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-surface-raised border border-surface-border rounded-md p-5 shadow-soft">
      <p className="text-[12px] font-medium text-content-muted uppercase tracking-widest mb-2">{label}</p>
      <p className="text-3xl font-semibold text-content-primary tabular-nums">{value.toLocaleString()}</p>
      {sub && <p className="text-[12px] text-content-muted mt-1">{sub}</p>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-surface-raised border border-surface-border rounded-md p-5 animate-pulse">
      <div className="h-3 w-20 bg-surface-border rounded mb-3" />
      <div className="h-8 w-16 bg-surface-border rounded" />
    </div>
  );
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setError("Không thể tải dữ liệu"));
  }, []);

  if (error) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-fail/10 border border-fail/20 rounded-md text-fail text-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const aiPct = stats.totalPages > 0
    ? Math.round((stats.pagesWithAI / stats.totalPages) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Jobs"   value={stats.totalJobs} />
        <StatCard label="Pages Crawled" value={stats.totalPages} />
        <StatCard label="Total Runs"   value={stats.totalRuns} />
        <StatCard label="AI Processed" value={stats.pagesWithAI} sub={`${aiPct}% of pages`} />
      </div>

      {/* Job status breakdown */}
      {Object.keys(stats.jobsByStatus).length > 0 && (
        <div className="bg-surface-raised border border-surface-border rounded-md p-5 shadow-soft">
          <p className="text-[12px] font-medium text-content-muted uppercase tracking-widest mb-4">Jobs by Status</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.jobsByStatus).map(([status, count]) => (
              <span
                key={status}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[12px] font-medium ${STATUS_STYLE[status] ?? "bg-surface-raised text-content-muted"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] ?? "bg-content-muted"}`} />
                {status} · {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent runs */}
      {stats.recentRuns.length > 0 && (
        <div className="bg-surface-raised border border-surface-border rounded-md shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <p className="text-[12px] font-medium text-content-muted uppercase tracking-widest">Recent Runs</p>
          </div>
          <div className="divide-y divide-surface-border">
            {stats.recentRuns.map((run) => {
              const duration = run.finishedAt
                ? Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
                : null;
              return (
                <div key={run.id} className="flex items-center justify-between px-5 py-3 hover:bg-surface-muted/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-content-primary truncate">{run.job.name}</p>
                    <p className="text-[12px] text-content-muted mt-0.5">
                      {new Date(run.startedAt).toLocaleString("vi-VN")}
                      {duration !== null && <span className="ml-2">· {duration}s</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <span className="text-[12px] text-content-secondary tabular-nums">
                      {run.pagesProcessed} pages
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-medium ${STATUS_STYLE[run.status] ?? ""}`}>
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
    </div>
  );
}
