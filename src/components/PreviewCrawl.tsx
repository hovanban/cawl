"use client";

import { useEffect, useState } from "react";

interface PreviewResult {
  url: string;
  statusCode: number | null;
  title: string | null;
  content: string | null;
  links: string[];
}

interface Props {
  url: string;
  jobId?: string;
}

export function PreviewCrawl({ url, jobId }: Props) {
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runPreview() {
    setLoading(true);
    setError(null);
    setResult(null);

    // If we have a jobId, use the job-specific endpoint; otherwise use a generic one
    const endpoint = jobId
      ? `/api/jobs/${jobId}/preview`
      : "/api/preview";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Preview failed");
    } else {
      setResult(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    runPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div className=" border border-gray-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Page Preview</h2>
        <button
          onClick={runPreview}
          disabled={loading}
          className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "Fetching..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${
                result.statusCode && result.statusCode < 400
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              HTTP {result.statusCode}
            </span>
            <span className="text-sm text-gray-500 truncate">{result.url}</span>
          </div>

          {result.title && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Title</p>
              <p className="text-sm font-semibold">{result.title}</p>
            </div>
          )}

          {result.content && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                Extracted Content (first 500 chars)
              </p>
              <pre className="bg-gray-50 rounded p-3 text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-40">
                {result.content.slice(0, 500)}
                {result.content.length > 500 ? "…" : ""}
              </pre>
            </div>
          )}

          {result.links.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                Links Found ({result.links.length} shown)
              </p>
              <ul className="space-y-1 max-h-40 overflow-auto">
                {result.links.map((link, i) => (
                  <li key={i} className="text-xs text-indigo-600 truncate">
                    {link}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
