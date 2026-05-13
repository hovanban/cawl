"use client";

import { useEffect, useState } from "react";

interface AiPrompt { id: string; name: string; }

interface GeneratedArticle {
  title: string; content: string; description: string; comments: string;
  titleRaw: string; contentRaw: string; descriptionRaw: string; commentsRaw: string;
}

interface Props { pageId: string; pageTitle: string | null; onClose: () => void; onApplied?: () => void; }

type Step = "select" | "loading" | "result" | "saving" | "error";
type Tab  = "title" | "content" | "description" | "comments";

export function AiPreviewModal({ pageId, pageTitle, onClose, onApplied }: Props) {
  const [prompts, setPrompts]       = useState<AiPrompt[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [step, setStep]             = useState<Step>("select");
  const [result, setResult]         = useState<GeneratedArticle | null>(null);
  const [errorMsg, setErrorMsg]     = useState("");
  const [tab, setTab]               = useState<Tab>("title");
  const [applied, setApplied]       = useState(false);

  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => r.json())
      .then((data: AiPrompt[]) => {
        setPrompts(data);
        if (data.length > 0) setSelectedId(data[0].id);
      });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleGenerate() {
    if (!selectedId) return;
    setStep("loading");
    try {
      const res  = await fetch(`/api/pages/${pageId}/ai-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptId: selectedId }),
      });
      let data: Record<string, unknown>;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server trả về lỗi ${res.status} (không có nội dung)`);
      }
      if (!res.ok) throw new Error((data.error as string) ?? "Lỗi không xác định");
      setResult(data as unknown as GeneratedArticle);
      setTab("title");
      setStep("result");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }

  async function handleApply() {
    if (!result) return;
    setStep("saving");
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentTitle:       result.title,
          currentContent:     result.content,
          currentDescription: result.description,
          ...(result.comments && { currentComments: result.comments }),
        }),
      });
      if (!res.ok) throw new Error("Lưu thất bại");
      setApplied(true);
      setStep("result");
      onApplied?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "title",       label: "Tiêu đề"  },
    { key: "content",     label: "Nội dung" },
    { key: "description", label: "Mô tả"    },
    ...(result?.comments ? [{ key: "comments" as Tab, label: "Comment" }] : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-raised border border-surface-border rounded-lg shadow-card w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-border shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-content-primary">AI Rewrite Preview</h2>
            {pageTitle && <p className="text-[11px] text-content-muted mt-0.5 line-clamp-1">{pageTitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-sm text-content-muted hover:text-content-primary hover:bg-surface-muted transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">

          {/* Select */}
          {(step === "select" || step === "error") && (
            <div className="p-6 space-y-4">
              {prompts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-lg bg-surface-muted border border-surface-border flex items-center justify-center mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <p className="text-content-secondary text-[13px]">Chưa có prompt config nào</p>
                  <a href="/settings" className="text-brand text-[12px] hover:underline mt-1">
                    Tạo tại Settings →
                  </a>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-2">
                      Chọn Prompt Config
                    </label>
                    <select
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      className="w-full bg-surface-muted border border-surface-border rounded-sm px-3 py-2 text-[13px] text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
                    >
                      {prompts.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-start gap-3 px-4 py-3 bg-purple-500/10 border border-purple-500/20 rounded-sm text-[12px] text-purple-400">
                    <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <div>
                      <p className="font-medium mb-0.5">Sẽ chạy AI song song:</p>
                      <p className="text-purple-400/70">Title · Content · Description · Comment (nếu có) — dùng Claude Sonnet</p>
                    </div>
                  </div>

                  {step === "error" && (
                    <div className="flex items-start gap-2 px-4 py-3 bg-fail/10 border border-fail/20 rounded-sm text-fail text-[12px]">
                      <svg className="shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {errorMsg}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Loading */}
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-2 border-surface-border border-t-brand rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-[13px] font-medium text-content-primary">Claude đang xử lý...</p>
                <p className="text-[11px] text-content-muted mt-1">Chạy 3 prompt song song</p>
              </div>
            </div>
          )}

          {/* Result */}
          {step === "result" && result && (
            <div className="p-5">
              <div className="flex border-b border-surface-border mb-4">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`py-2.5 px-4 text-[12px] font-medium border-b-2 -mb-px transition-colors ${
                      tab === t.key
                        ? "border-brand text-brand"
                        : "border-transparent text-content-muted hover:text-content-primary"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "title" && (
                <div className="space-y-4">
                  <div className="bg-surface-muted border border-surface-border rounded-sm p-4">
                    <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-2">Tiêu đề mới</p>
                    <p className="text-[16px] font-semibold text-content-primary leading-snug">{result.title}</p>
                    <p className="text-[11px] text-content-muted mt-2">{result.title.length} ký tự</p>
                  </div>
                  <div className="px-4 py-3 border border-surface-border rounded-sm">
                    <p className="text-[11px] text-content-muted mb-1">Tiêu đề gốc</p>
                    <p className="text-[13px] text-content-secondary">{pageTitle}</p>
                  </div>
                </div>
              )}

              {tab === "content" && (
                <div
                  className="prose-dark prose prose-sm max-w-none border border-surface-border rounded-sm p-4 bg-surface-muted
                    [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_p]:my-1.5 [&_li]:ml-4 [&_li]:list-disc [&_a]:text-brand"
                  dangerouslySetInnerHTML={{ __html: result.content }}
                />
              )}

              {tab === "comments" && (
                <div className="bg-surface-muted border border-surface-border rounded-sm p-4">
                  <p className="text-[11px] font-medium text-content-muted uppercase tracking-wider mb-2">Comments đã rewrite</p>
                  <pre className="text-[13px] text-content-primary whitespace-pre-wrap leading-relaxed">{result.comments}</pre>
                  <p className="text-[11px] text-content-muted mt-3">{result.comments.length} ký tự</p>
                </div>
              )}

              {tab === "description" && (
                <div className="space-y-3">
                  <div className="bg-surface-muted border border-surface-border rounded-sm p-4">
                    <p className="text-[13px] text-content-primary leading-relaxed">{result.description}</p>
                    <p className="text-[11px] text-content-muted mt-3">{result.description.length} ký tự</p>
                  </div>
                  <p className={`text-[11px] ${
                    result.description.length >= 120 && result.description.length <= 160
                      ? "text-ok"
                      : "text-warn"
                  }`}>
                    Meta description lý tưởng: 120–160 ký tự
                    {result.description.length >= 120 && result.description.length <= 160
                      ? " ✓"
                      : ` (hiện ${result.description.length < 120 ? "ngắn quá" : "dài quá"})`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-surface-border bg-surface-muted shrink-0">
          {step === "result" || step === "saving" ? (
            <>
              <button onClick={() => { setStep("select"); setApplied(false); }}
                className="text-[12px] text-content-muted hover:text-content-primary transition-colors">
                ← Chọn lại
              </button>
              <div className="flex items-center gap-2">
                {applied && (
                  <span className="text-[11px] text-ok flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Đã lưu
                  </span>
                )}
                <button onClick={handleGenerate} disabled={step === "saving"}
                  className="text-[13px] border border-surface-border text-content-secondary hover:text-content-primary px-3 py-1.5 rounded-sm disabled:opacity-40 transition-colors">
                  Tạo lại
                </button>
                <button onClick={handleApply} disabled={step === "saving" || applied}
                  className="text-[13px] bg-brand hover:bg-brand-hover text-white px-4 py-1.5 rounded-sm disabled:opacity-40 transition-colors flex items-center gap-1.5">
                  {step === "saving" && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {applied ? "Đã áp dụng" : "Áp dụng"}
                </button>
              </div>
            </>
          ) : (
            <>
              <button onClick={onClose}
                className="text-[12px] text-content-muted hover:text-content-primary transition-colors">
                Huỷ
              </button>
              <button
                onClick={handleGenerate}
                disabled={!selectedId || step === "loading" || prompts.length === 0}
                className="text-[13px] bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-sm disabled:opacity-40 transition-colors"
              >
                Tạo bài viết
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
