"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PreviewCrawl } from "./PreviewCrawl";

interface JobFormProps { jobId?: string; }

interface FormData {
  name: string; startUrl: string; maxDepth: number; limitPosts: number;
  rateLimit: number; concurrency: number; schedule: string;
  email: string; martialArt: string;
  detailLinkSelector: string; titleSelector: string; imageListSelector: string;
  contentSelector: string; removeElementSelector: string; imageDetailSelector: string; videoSelector: string; commentSelector: string;
  apiToken: string; apiBaseUrl: string; apiArticleUrlField: string;
}

const DEFAULTS: FormData = {
  name: "", startUrl: "", maxDepth: 3, limitPosts: 20, rateLimit: 1000, concurrency: 3, schedule: "",
  email: "", martialArt: "",
  detailLinkSelector: "", titleSelector: "", imageListSelector: "",
  contentSelector: "", removeElementSelector: "", imageDetailSelector: "", videoSelector: "", commentSelector: "",
  apiToken: "", apiBaseUrl: "", apiArticleUrlField: "",
};

type TabKey = "basic" | "scraping";

const TABS: { key: TabKey; label: string }[] = [
  { key: "basic",    label: "Cơ bản"   },
  { key: "scraping", label: "Thu thập" },
];

function tabHasData(tab: TabKey, form: FormData): boolean {
  switch (tab) {
    case "scraping": return !!(form.detailLinkSelector || form.contentSelector || form.apiToken || form.apiBaseUrl);
    default:         return false;
  }
}

// ── Shared input classes ─────────────────────────────────────────────────────
const inputCls = "w-full bg-surface-muted border border-surface-border rounded-sm px-3 py-2 text-[13px] text-content-primary placeholder:text-content-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors";
const monoCls  = inputCls + " font-mono";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-content-muted mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-[11px] font-semibold text-content-muted uppercase tracking-wider pb-2 border-b border-surface-border w-full mb-1">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function InfoBox({ variant, children }: { variant: "info" | "warn"; children: React.ReactNode }) {
  return (
    <div className={`px-3 py-2.5 rounded-sm text-[12px] leading-relaxed ${
      variant === "warn"
        ? "bg-warn/10 border border-warn/20 text-warn"
        : "bg-brand/10 border border-brand/20 text-brand"
    }`}>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none group">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-fast ${checked ? "bg-brand" : "bg-surface-border"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4  rounded-full shadow-sm transition-transform duration-fast ${checked ? "translate-x-4" : ""}`} />
      </div>
      <span className="text-[13px] text-content-secondary group-hover:text-content-primary transition-colors">{label}</span>
    </label>
  );
}

export function JobForm({ jobId }: JobFormProps) {
  const router = useRouter();
  const [form, setForm]           = useState<FormData>(DEFAULTS);
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then((job) => setForm({
        name: job.name, startUrl: job.startUrl,
        maxDepth: job.maxDepth, limitPosts: job.limitPosts ?? 20,
        rateLimit: job.rateLimit, concurrency: job.concurrency,
        schedule: job.schedule ?? "",
        email: job.email ?? "", martialArt: job.martialArt ?? "",
        detailLinkSelector: job.detailLinkSelector ?? "", titleSelector: job.titleSelector ?? "",
        imageListSelector: job.imageListSelector ?? "", contentSelector: job.contentSelector ?? "",
        removeElementSelector: job.removeElementSelector ?? "", imageDetailSelector: job.imageDetailSelector ?? "",
        videoSelector: job.videoSelector ?? "", commentSelector: job.commentSelector ?? "",
        apiToken: job.apiToken ?? "",
        apiBaseUrl: job.apiBaseUrl ?? "", apiArticleUrlField: job.apiArticleUrlField ?? "",
      }))
      .finally(() => setLoading(false));
  }, [jobId]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      schedule: form.schedule || null,
      email: form.email || null,
      martialArt: form.martialArt || null,
      detailLinkSelector: form.detailLinkSelector || null, titleSelector: form.titleSelector || null,
      imageListSelector: form.imageListSelector || null, contentSelector: form.contentSelector || null,
      removeElementSelector: form.removeElementSelector || null, imageDetailSelector: form.imageDetailSelector || null,
      videoSelector: form.videoSelector || null, commentSelector: form.commentSelector || null,
      apiToken: form.apiToken || null,
      apiBaseUrl: form.apiBaseUrl || null, apiArticleUrlField: form.apiArticleUrlField || null,
    };

    const res = await fetch(jobId ? `/api/jobs/${jobId}` : "/api/jobs", {
      method: jobId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      setSaving(false);
      return;
    }
    router.push(`/jobs/${(await res.json()).id}`);
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4 animate-pulse">
        <div className="h-10 bg-surface-raised border border-surface-border rounded-md" />
        <div className="h-64 bg-surface-raised border border-surface-border rounded-md" />
      </div>
    );
  }

  const numCls = "w-full bg-surface-muted border border-surface-border rounded-sm px-3 py-2 text-[13px] text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors";

  return (
    <div className="max-w-2xl space-y-4">
      <form onSubmit={handleSubmit} className="bg-surface-raised border border-surface-border rounded-md shadow-soft overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-surface-border bg-surface-muted">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            const hasDot = tabHasData(tab.key, form);
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-5 py-3 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                  active
                    ? "border-brand text-brand bg-surface-raised"
                    : "border-transparent text-content-muted hover:text-content-primary hover:bg-surface-raised/50"
                }`}
              >
                {tab.label}
                {hasDot && !active && <span className="w-1.5 h-1.5 rounded-full bg-brand/60" />}
              </button>
            );
          })}
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-fail/10 border border-fail/20 rounded-sm text-fail text-[12px]">
              <svg className="shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* Tab 1 — Cơ bản */}
          {activeTab === "basic" && (
            <>
              <Section title="Thông tin">
                <Field label="Tên Job">
                  <input required type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
                    placeholder="My Crawl Job" className={inputCls} />
                </Field>
                <Field label="Start URL">
                  <input required type="url" value={form.startUrl} onChange={(e) => set("startUrl", e.target.value)}
                    placeholder="https://example.com/category/football" className={inputCls} />
                </Field>
              </Section>

              <Section title="Cài đặt Crawl">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Max Depth" hint="Số trang danh sách phân trang">
                    <input type="number" min={1} max={50} value={form.maxDepth}
                      onChange={(e) => set("maxDepth", parseInt(e.target.value))} className={numCls} />
                  </Field>
                  <Field label="Limit Posts" hint="Số bài tối đa">
                    <input type="number" min={1} max={10000} value={form.limitPosts}
                      onChange={(e) => set("limitPosts", parseInt(e.target.value))} className={numCls} />
                  </Field>
                  <Field label="Rate Limit (ms)" hint="Độ trễ giữa requests">
                    <input type="number" min={0} step={100} value={form.rateLimit}
                      onChange={(e) => set("rateLimit", parseInt(e.target.value))} className={numCls} />
                  </Field>
                  <Field label="Concurrency" hint="Số request song song">
                    <input type="number" min={1} max={10} value={form.concurrency}
                      onChange={(e) => set("concurrency", parseInt(e.target.value))} className={numCls} />
                  </Field>
                </div>
              </Section>

              <Section title="Lịch chạy">
                <Field label="Cron Expression" hint="Để trống = chỉ chạy thủ công. VD: 0 * * * * (mỗi giờ)">
                  <input type="text" value={form.schedule} onChange={(e) => set("schedule", e.target.value)}
                    placeholder="0 * * * *" className={monoCls} />
                </Field>
              </Section>

              <Section title="Thông tin bổ sung">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Email">
                    <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                      placeholder="admin@example.com" className={inputCls} />
                  </Field>
                  <Field label="Môn võ">
                    <input type="text" value={form.martialArt} onChange={(e) => set("martialArt", e.target.value)}
                      placeholder="MMA, Boxing, Muay Thai..." className={inputCls} />
                  </Field>
                </div>
              </Section>
            </>
          )}

          {/* Tab 2 — Thu thập */}
          {activeTab === "scraping" && (
            <>
              <Section title="Trang danh sách — Phase 1">
                <Field label="Link bài viết" hint="CSS selector cho thẻ <a>">
                  <input type="text" value={form.detailLinkSelector} onChange={(e) => set("detailLinkSelector", e.target.value)}
                    placeholder="div[data-testid='promo'] a[href^='/sport']" className={monoCls} />
                </Field>
                <Field label="Tiêu đề" hint="CSS selector tiêu đề trên trang danh sách">
                  <input type="text" value={form.titleSelector} onChange={(e) => set("titleSelector", e.target.value)}
                    placeholder="div[data-testid='promo'] p[class*='Headline'] span" className={monoCls} />
                </Field>
                <Field label="Ảnh thumbnail">
                  <input type="text" value={form.imageListSelector} onChange={(e) => set("imageListSelector", e.target.value)}
                    placeholder=".list-news .thumb-art img" className={monoCls} />
                </Field>
              </Section>

              <Section title="Trang chi tiết — Phase 2">
                <Field label="Vùng nội dung" hint="CSS selector content area. VD: article.fck_detail">
                  <input type="text" value={form.contentSelector} onChange={(e) => set("contentSelector", e.target.value)}
                    placeholder="#main-content" className={monoCls} />
                </Field>
                <Field label="Xóa phần tử" hint="Selector phần tử cần xóa: .ads, script, iframe...">
                  <input type="text" value={form.removeElementSelector} onChange={(e) => set("removeElementSelector", e.target.value)}
                    placeholder="script, iframe, .ads, .related" className={monoCls} />
                </Field>
                <Field label="Ảnh trong bài" hint="Để trống = lấy tất cả ảnh trong content">
                  <input type="text" value={form.imageDetailSelector} onChange={(e) => set("imageDetailSelector", e.target.value)}
                    placeholder=".thumbnail-container img" className={monoCls} />
                </Field>
                <Field label="Video">
                  <input type="text" value={form.videoSelector} onChange={(e) => set("videoSelector", e.target.value)}
                    placeholder="video source, iframe[src*='youtube']" className={monoCls} />
                </Field>
                <Field label="Comment" hint="CSS selector cho danh sách comment. VD: .comment-item, .cmt-content">
                  <input type="text" value={form.commentSelector} onChange={(e) => set("commentSelector", e.target.value)}
                    placeholder=".comment-item, ul.comments li" className={monoCls} />
                </Field>
              </Section>

              <Section title="API Mode — JSON API">
                <InfoBox variant="info">
                  Điền <strong>API Token</strong> + <strong>Base URL</strong> để bật API mode. Start URL là endpoint JSON.
                </InfoBox>
                <Field label="API Token (Bearer)" hint="Token xác thực, lấy từ source code website">
                  <input type="text" value={form.apiToken} onChange={(e) => set("apiToken", e.target.value)}
                    placeholder="47f56e02dc83806f84c2f7e6..." className={monoCls} />
                </Field>
                <Field label="Base URL" hint="URL gốc website">
                  <input type="text" value={form.apiBaseUrl} onChange={(e) => set("apiBaseUrl", e.target.value)}
                    placeholder="https://www.vothuat.vn" className={monoCls} />
                </Field>
                <Field label="Article URL Field" hint="Tên field chứa URL bài (để trống = slug + Base URL)">
                  <input type="text" value={form.apiArticleUrlField} onChange={(e) => set("apiArticleUrlField", e.target.value)}
                    placeholder="remotePostUrl" className={monoCls} />
                </Field>
              </Section>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2.5 pt-2 border-t border-surface-border">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-[13px] font-medium rounded-sm disabled:opacity-50 transition-colors"
            >
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? "Đang lưu..." : jobId ? "Cập nhật Job" : "Tạo Job"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-surface-border text-[13px] text-content-secondary hover:text-content-primary hover:border-content-muted rounded-sm transition-colors"
            >
              Hủy
            </button>
            {form.startUrl && (
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                className="ml-auto px-4 py-2 border border-brand/40 text-[13px] text-brand hover:bg-brand/10 rounded-sm transition-colors"
              >
                {showPreview ? "Ẩn Preview" : "Preview URL"}
              </button>
            )}
          </div>
        </div>
      </form>

      {showPreview && form.startUrl && <PreviewCrawl url={form.startUrl} />}
    </div>
  );
}
