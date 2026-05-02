"use client";

import { useEffect, useState } from "react";

const inputCls =
  "w-full bg-surface-muted border border-surface-border rounded-sm px-3 py-2 text-[13px] text-content-primary placeholder:text-content-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors font-mono";

export function AnthropicSettings() {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [masked, setMasked] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        if (data.anthropic_api_key) setApiKey(data.anthropic_api_key);
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anthropic_api_key: apiKey.trim() }),
      });
      if (!res.ok) throw new Error("Lưu thất bại");
      setStatus("ok");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Lỗi");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface-raised border border-surface-border rounded-md shadow-soft p-5 space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold text-content-primary">Anthropic AI</h2>
        <p className="text-[12px] text-content-muted mt-0.5">
          API key dùng cho tính năng AI (crawl, rewrite, generate article).{" "}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline"
          >
            Lấy API key tại Anthropic Console
          </a>
          .
        </p>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">
          API Key
        </label>
        <div className="relative">
          <input
            type={masked ? "password" : "text"}
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setStatus("idle"); }}
            placeholder="sk-ant-api03-..."
            className={inputCls + " pr-16"}
          />
          <button
            type="button"
            onClick={() => setMasked((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-content-muted hover:text-content-primary transition-colors"
          >
            {masked ? "Hiện" : "Ẩn"}
          </button>
        </div>
        <p className="text-[11px] text-content-muted mt-1.5">
          Key được lưu trong DB, ưu tiên cao hơn biến môi trường{" "}
          <code className="bg-surface-muted border border-surface-border px-1 rounded-sm text-content-secondary">
            ANTHROPIC_API_KEY
          </code>
          .
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !apiKey.trim()}
          className="px-4 py-1.5 text-[13px] bg-brand hover:bg-brand-hover text-white rounded-sm disabled:opacity-40 transition-colors"
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </button>
        {status === "ok" && (
          <span className="text-[13px] text-ok">✓ Đã lưu thành công.</span>
        )}
        {status === "error" && (
          <span className="text-[13px] text-fail">✗ {errorMsg}</span>
        )}
      </div>
    </div>
  );
}
