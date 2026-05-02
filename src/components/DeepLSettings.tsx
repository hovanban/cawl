"use client";

import { useEffect, useState } from "react";

const LANG_OPTIONS = [
  { value: "VI", label: "Tiếng Việt (VI)" },
  { value: "EN-US", label: "Tiếng Anh Mỹ (EN-US)" },
  { value: "EN-GB", label: "Tiếng Anh Anh (EN-GB)" },
  { value: "ZH", label: "Tiếng Trung (ZH)" },
  { value: "JA", label: "Tiếng Nhật (JA)" },
  { value: "KO", label: "Tiếng Hàn (KO)" },
  { value: "FR", label: "Tiếng Pháp (FR)" },
  { value: "DE", label: "Tiếng Đức (DE)" },
];

const inputCls = "w-full bg-surface-muted border border-surface-border rounded-sm px-3 py-2 text-[13px] text-content-primary placeholder:text-content-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors";

export function DeepLSettings() {
  const [apiKey, setApiKey]         = useState("");
  const [targetLang, setTargetLang] = useState("VI");
  const [saving, setSaving]         = useState(false);
  const [status, setStatus]         = useState<"idle" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg]     = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        if (data.deepl_api_key)     setApiKey(data.deepl_api_key);
        if (data.deepl_target_lang) setTargetLang(data.deepl_target_lang);
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
        body: JSON.stringify({
          deepl_api_key: apiKey.trim(),
          deepl_target_lang: targetLang,
        }),
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
        <h2 className="text-[15px] font-semibold text-content-primary">DeepL Translation</h2>
        <p className="text-[12px] text-content-muted mt-0.5">
          Cấu hình DeepL API để dịch bài viết.{" "}
          <a
            href="https://www.deepl.com/pro-api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline"
          >
            Lấy API key tại đây
          </a>{" "}
          (free tier: 500k ký tự/tháng).
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx"
            className={inputCls + " font-mono"}
          />
          <p className="text-[11px] text-content-muted mt-1.5">
            Key kết thúc bằng <code className="bg-surface-muted border border-surface-border px-1 rounded-sm text-content-secondary">:fx</code> là free tier.
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">
            Ngôn ngữ đích
          </label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="bg-surface-muted border border-surface-border rounded-sm px-3 py-2 text-[13px] text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
          >
            {LANG_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-surface-raised">
                {o.label}
              </option>
            ))}
          </select>
        </div>
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
