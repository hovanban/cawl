"use client";

import { useEffect, useState } from "react";

interface AiPrompt {
  id: string;
  name: string;
  systemRole: string;
  titleTemplate: string;
  contentTemplate: string;
  descriptionTemplate: string;
  titleDescriptionTemplate: string;
  createdAt: string;
}

const DEFAULT_SYSTEM_ROLE = `Bạn là chuyên gia dịch thuật và biên tập nội dung chuyên nghiệp. Nhiệm vụ của bạn là dịch và soạn lại nội dung cho các bài viết đã được crawl về, đảm bảo chất lượng, tự nhiên và phù hợp với người đọc Việt Nam.`;

const DEFAULT_TITLE = `Nhiệm vụ:
Bạn cần viết lại tiêu đề bài viết sau HOÀN TOÀN BẰNG TIẾNG VIỆT.

YÊU CẦU:
- Giữ nguyên ý nghĩa và thông điệp chính của tiêu đề gốc.
- Diễn đạt mới hoàn toàn, tự nhiên, hấp dẫn, không trùng câu chữ hoặc cấu trúc với bản gốc.
- Chuẩn SEO: độ dài 50–70 ký tự, chứa từ khóa chính một cách tự nhiên, tăng khả năng click (CTR).
- Văn phong chuyên nghiệp, phù hợp ngữ cảnh.
- Không thêm dấu ngoặc kép, không thêm ký tự thừa đầu hoặc cuối.

TIÊU ĐỀ GỐC:
{blog_title}`;

const DEFAULT_CONTENT = `Nhiệm vụ:
Bạn cần viết lại bài viết sau HOÀN TOÀN BẰNG TIẾNG VIỆT.

YÊU CẦU:
- Giữ nguyên ý nghĩa, cấu trúc và thông điệp chính của bài viết gốc.
- Diễn đạt mới hoàn toàn, tự nhiên, không mang dấu hiệu máy móc hoặc dịch máy.
- Chuẩn SEO: bố cục rõ ràng, có heading, đoạn văn ngắn, dễ đọc.
- Văn phong chuyên nghiệp, phù hợp với đối tượng độc giả Việt Nam.
- Trả về nội dung HTML (dùng các thẻ p, h2, h3, ul, li, strong).

NỘI DUNG GỐC:
{blog_content}`;

const DEFAULT_TITLE_DESCRIPTION = `Nhiệm vụ:
Bạn cần viết lại đồng thời tiêu đề và mô tả ngắn của bài viết sau HOÀN TOÀN BẰNG TIẾNG VIỆT.

YÊU CẦU:
- Giữ nguyên ý nghĩa và thông điệp chính.
- Diễn đạt mới hoàn toàn, tự nhiên, không mang dấu hiệu máy móc.
- Tiêu đề: chuẩn SEO 50–70 ký tự, có từ khóa chính, tăng CTR.
- Mô tả: chuẩn meta description 120–160 ký tự, có từ khóa, hấp dẫn, kết thúc bằng dấu chấm.
- Không thêm dấu ngoặc kép hay ký tự thừa.

Trả về JSON theo đúng định dạng sau (không thêm markdown, không thêm gì khác):
{"title": "...", "description": "..."}

TIÊU ĐỀ GỐC:
{blog_title}

MÔ TẢ NGẮN GỐC:
{short_details}`;

const DEFAULT_DESCRIPTION = `Nhiệm vụ:
Bạn cần viết lại mô tả ngắn (short description) sau HOÀN TOÀN BẰNG TIẾNG VIỆT.

YÊU CẦU:
- Giữ nguyên ý chính và thông điệp cốt lõi.
- Diễn đạt mới hoàn toàn, tự nhiên, không mang dấu hiệu máy móc.
- Chuẩn SEO cho meta description: độ dài 120–160 ký tự, có từ khóa chính một cách tự nhiên, hấp dẫn, tăng CTR.
- Kết thúc bằng dấu chấm, không dùng dấu ba chấm.
- Không trùng lặp câu chữ hoặc cấu trúc với bản gốc.

MÔ TẢ NGẮN GỐC:
{short_details}`;

const EMPTY_FORM = {
  name: "",
  systemRole: DEFAULT_SYSTEM_ROLE,
  titleTemplate: DEFAULT_TITLE,
  contentTemplate: DEFAULT_CONTENT,
  descriptionTemplate: DEFAULT_DESCRIPTION,
  titleDescriptionTemplate: DEFAULT_TITLE_DESCRIPTION,
};

type FormData = typeof EMPTY_FORM;

type Section = "system" | "title" | "content" | "description" | "titleDescription";

const SECTIONS: { key: Section; label: string; field: keyof FormData; placeholder: string; hint: string }[] = [
  {
    key: "system",
    label: "System Role",
    field: "systemRole",
    placeholder: "{blog_title}, {blog_content}, {short_details}",
    hint: "Định nghĩa vai trò AI. Áp dụng cho cả 3 prompt bên dưới.",
  },
  {
    key: "title",
    label: "Title Rewrite Prompt",
    field: "titleTemplate",
    placeholder: "{blog_title}",
    hint: "Dùng {blog_title} làm placeholder cho tiêu đề gốc.",
  },
  {
    key: "content",
    label: "Content Rewrite Prompt",
    field: "contentTemplate",
    placeholder: "{blog_content}",
    hint: "Dùng {blog_content} làm placeholder cho nội dung gốc (tự động strip HTML).",
  },
  {
    key: "description",
    label: "Description Rewrite Prompt",
    field: "descriptionTemplate",
    placeholder: "{short_details}",
    hint: "Dùng {short_details} làm placeholder (500 ký tự đầu của nội dung).",
  },
  {
    key: "titleDescription",
    label: "Title & Description Rewrite Prompt",
    field: "titleDescriptionTemplate",
    placeholder: "{blog_title}, {short_details}",
    hint: 'Viết lại tiêu đề và mô tả cùng lúc. Trả về JSON {"title": "...", "description": "..."}.',
  },
];

const inputCls = "w-full bg-surface-muted border border-surface-border rounded-sm px-3 py-2 text-[13px] text-content-primary placeholder:text-content-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors";

export function PromptSettings() {
  const [prompts, setPrompts]   = useState<AiPrompt[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<Section>("system");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/prompts");
    setPrompts(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setOpenSection("system");
    setShowForm(true);
  }

  function openEdit(p: AiPrompt) {
    setEditId(p.id);
    setForm({
      name: p.name,
      systemRole: p.systemRole,
      titleTemplate: p.titleTemplate,
      contentTemplate: p.contentTemplate,
      descriptionTemplate: p.descriptionTemplate,
      titleDescriptionTemplate: p.titleDescriptionTemplate,
    });
    setOpenSection("system");
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await fetch(editId ? `/api/prompts/${editId}` : "/api/prompts", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setEditId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá prompt này?")) return;
    setDeleting(id);
    await fetch(`/api/prompts/${id}`, { method: "DELETE" });
    setDeleting(null);
    await load();
  }

  return (
    <div className="space-y-6">

      {/* List */}
      <div className="bg-surface-raised border border-surface-border rounded-md shadow-soft overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border bg-surface-muted">
          <h2 className="text-[15px] font-semibold text-content-primary">Prompt Configs</h2>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 text-[13px] bg-brand hover:bg-brand-hover text-white px-3 py-1.5 rounded-sm transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Thêm config
          </button>
        </div>

        {loading && <p className="p-6 text-[13px] text-content-muted">Đang tải...</p>}

        {!loading && prompts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-sm bg-surface-muted border border-surface-border flex items-center justify-center mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-content-muted">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <p className="text-[13px] text-content-secondary">Chưa có config nào</p>
            <p className="text-[12px] text-content-muted mt-0.5">Tạo mới để bắt đầu.</p>
          </div>
        )}

        {prompts.map((p) => (
          <div key={p.id} className="px-5 py-4 border-b border-surface-border last:border-0 hover:bg-surface-muted/40 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-content-primary">{p.name}</p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[
                    { label: "Title", value: p.titleTemplate },
                    { label: "Content", value: p.contentTemplate },
                    { label: "Description", value: p.descriptionTemplate },
                    { label: "Title & Desc", value: p.titleDescriptionTemplate },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-surface-muted rounded-sm border border-surface-border px-2 py-1.5">
                      <p className="text-[11px] font-medium text-content-muted mb-1">{label}</p>
                      <p className="text-[11px] text-content-secondary line-clamp-2 leading-relaxed">
                        {value || <span className="italic text-content-muted">Trống</span>}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-content-muted mt-2">
                  {new Date(p.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => openEdit(p)}
                  className="text-[12px] px-2.5 py-1 border border-surface-border text-content-secondary hover:text-content-primary hover:bg-surface-muted rounded-sm transition-colors"
                >
                  Sửa
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={deleting === p.id}
                  className="text-[12px] px-2.5 py-1 border border-fail/30 text-fail hover:bg-fail/10 rounded-sm disabled:opacity-40 transition-colors"
                >
                  Xoá
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-surface-raised border border-brand/30 rounded-md shadow-soft overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-border bg-surface-muted">
            <p className="text-[13px] font-medium text-content-primary">
              {editId ? "Chỉnh sửa" : "Tạo mới"} Prompt Config
            </p>
          </div>
          <div className="p-5 space-y-4">

            {/* Name */}
            <div>
              <label className="block text-[11px] font-medium text-content-muted uppercase tracking-wider mb-1.5">Tên config *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ví dụ: Dịch sang tiếng Việt SEO"
                className={inputCls}
              />
            </div>

            {/* Accordion sections */}
            <div className="border border-surface-border rounded-sm overflow-hidden divide-y divide-surface-border">
              {SECTIONS.map((sec) => (
                <div key={sec.key}>
                  <button
                    type="button"
                    onClick={() => setOpenSection(openSection === sec.key ? ("" as Section) : sec.key)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-surface-muted hover:bg-surface-base text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-content-primary">{sec.label}</span>
                      <span className="text-[11px] text-content-muted font-mono bg-surface-raised border border-surface-border px-1.5 py-0.5 rounded-sm">
                        {sec.placeholder}
                      </span>
                    </div>
                    <span className="text-content-muted text-[11px]">{openSection === sec.key ? "▲" : "▼"}</span>
                  </button>

                  {openSection === sec.key && (
                    <div className="p-4 space-y-2 bg-surface-base">
                      <p className="text-[12px] text-content-muted">{sec.hint}</p>
                      <textarea
                        value={form[sec.field] as string}
                        onChange={(e) => setForm({ ...form, [sec.field]: e.target.value })}
                        rows={sec.key === "system" ? 4 : 12}
                        className={inputCls + " font-mono resize-y"}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => { setShowForm(false); setEditId(null); }}
                className="text-[13px] border border-surface-border text-content-secondary hover:text-content-primary hover:bg-surface-muted px-4 py-1.5 rounded-sm transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="text-[13px] bg-brand hover:bg-brand-hover text-white px-4 py-1.5 rounded-sm disabled:opacity-40 transition-colors"
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder reference */}
      <div className="bg-surface-raised border border-surface-border rounded-md p-4">
        <p className="text-[12px] font-semibold text-content-secondary uppercase tracking-wider mb-3">Placeholder reference</p>
        <div className="grid grid-cols-4 gap-3 text-[11px]">
          {[
            { code: "{blog_title}",    desc: "Tiêu đề bài viết gốc",       use: "Title / Title & Desc Prompt" },
            { code: "{blog_content}",  desc: "Nội dung gốc (strip HTML)",   use: "Content Prompt" },
            { code: "{short_details}", desc: "500 ký tự đầu của nội dung",  use: "Description / Title & Desc Prompt" },
            { code: '{"title","description"}', desc: "JSON output",         use: "Title & Desc Prompt" },
          ].map(({ code, desc, use }) => (
            <div key={code} className="bg-surface-muted border border-surface-border rounded-sm p-2">
              <code className="font-mono font-medium text-brand block mb-1">{code}</code>
              <p className="text-content-secondary">{desc}</p>
              <p className="text-content-muted mt-0.5">→ {use}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
