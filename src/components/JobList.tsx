"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Job {
  id: string;
  name: string;
  startUrl: string;
  status: string;
  schedule: string | null;
  aiEnabled: boolean;
  createdAt: string;
  _count: { pages: number; runs: number };
  runs: Array<{ status: string; startedAt: string }>;
}

const STATUS_STYLE: Record<string, string> = {
  IDLE:      "bg-surface-border text-content-muted",
  RUNNING:   "bg-brand/15 text-brand",
  COMPLETED: "bg-ok/15 text-ok",
  FAILED:    "bg-fail/15 text-fail",
  PAUSED:    "bg-warn/15 text-warn",
};

const STATUS_DOT: Record<string, string> = {
  IDLE:      "bg-content-muted",
  RUNNING:   "bg-brand animate-pulse",
  COMPLETED: "bg-ok",
  FAILED:    "bg-fail",
  PAUSED:    "bg-warn",
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 animate-pulse">
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-48 bg-surface-border rounded" />
        <div className="h-3 w-64 bg-surface-border rounded" />
      </div>
      <div className="h-6 w-20 bg-surface-border rounded-sm" />
    </div>
  );
}

export function JobList() {
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<Set<string>>(new Set());
  const intervalRef           = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJobs = () =>
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data: Job[]) => {
        setJobs(data);
        // auto-poll khi có job đang chạy
        const hasRunning = data.some((j) => j.status === "RUNNING");
        if (hasRunning && !intervalRef.current) {
          intervalRef.current = setInterval(() => {
            fetch("/api/jobs")
              .then((r) => r.json())
              .then((fresh: Job[]) => {
                setJobs(fresh);
                if (!fresh.some((j) => j.status === "RUNNING")) {
                  clearInterval(intervalRef.current!);
                  intervalRef.current = null;
                }
              });
          }, 3000);
        } else if (!hasRunning && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    fetchJobs();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRun(jobId: string) {
    setRunning((s) => new Set(s).add(jobId));
    await fetch(`/api/jobs/${jobId}/run`, { method: "POST" });
    setRunning((s) => { const n = new Set(s); n.delete(jobId); return n; });
    fetchJobs();
  }

  async function handleDelete(jobId: string) {
    if (!confirm("Xoá job này và toàn bộ dữ liệu?")) return;
    await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }

  if (loading) {
    return (
      <div className="bg-surface-raised border border-surface-border rounded-md shadow-soft overflow-hidden divide-y divide-surface-border">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-lg bg-surface-raised border border-surface-border flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          </svg>
        </div>
        <p className="text-content-secondary text-sm mb-1">Chưa có job nào</p>
        <p className="text-content-muted text-[12px] mb-4">Tạo job đầu tiên để bắt đầu crawl</p>
        <Link
          href="/jobs/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-sm transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Job
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-surface-raised border border-surface-border rounded-md shadow-soft overflow-hidden divide-y divide-surface-border">
      {jobs.map((job) => {
        const isRunning = job.status === "RUNNING" || running.has(job.id);
        return (
          <div key={job.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-muted/40 transition-colors group">
            {/* Status dot */}
            <span className={`shrink-0 w-2 h-2 rounded-full mt-0.5 ${STATUS_DOT[job.status] ?? "bg-content-muted"}`} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Link
                  href={`/jobs/${job.id}`}
                  className="text-[14px] font-medium text-content-primary hover:text-brand transition-colors truncate"
                >
                  {job.name}
                </Link>
                <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-medium ${STATUS_STYLE[job.status] ?? ""}`}>
                  {job.status}
                </span>
                {job.schedule && (
                  <span className="shrink-0 px-2 py-0.5 rounded-sm text-[11px] font-medium bg-warn/15 text-warn">
                    ⏰ {job.schedule}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-content-muted truncate">{job.startUrl}</p>
              <p className="text-[11px] text-content-muted mt-0.5">
                {job._count.pages.toLocaleString()} bài · {job._count.runs} runs
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleRun(job.id)}
                disabled={isRunning}
                className="text-[12px] px-3 py-1.5 bg-brand hover:bg-brand-hover text-white rounded-sm disabled:opacity-40 transition-colors"
              >
                {isRunning ? "Running..." : "Run"}
              </button>
              <Link
                href={`/jobs/${job.id}/edit`}
                className="text-[12px] px-3 py-1.5 border border-surface-border text-content-secondary hover:text-content-primary hover:border-content-muted rounded-sm transition-colors"
              >
                Edit
              </Link>
              <button
                onClick={() => handleDelete(job.id)}
                className="text-[12px] px-3 py-1.5 border border-fail/30 text-fail hover:bg-fail/10 rounded-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
