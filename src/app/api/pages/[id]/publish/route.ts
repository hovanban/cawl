/**
 * POST /api/pages/[id]/publish
 * Body: { siteId: string }
 * Gửi bài viết lên site ngoài. Ưu tiên: rewritten → translated → gốc
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await req.json();
    if (!siteId) return NextResponse.json({ error: "siteId là bắt buộc" }, { status: 400 });

    const [page, site] = await Promise.all([
      prisma.crawledPage.findUnique({ where: { id: params.id } }),
      prisma.publishSite.findUnique({ where: { id: siteId } }),
    ]);

    if (!page) return NextResponse.json({ error: "Bài viết không tồn tại" }, { status: 404 });
    if (!site) return NextResponse.json({ error: "Site không tồn tại" }, { status: 404 });

    const title   = page.currentTitle       || page.title   || "";
    const content = page.currentContent     || page.content || "";
    const excerpt = page.currentDescription || "";

    const payload = {
      title,
      excerpt,
      thumbnail: page.thumbnail   || "",
      content,
      martialArt:  page.martialArt  || "",
      tags:        [] as string[],
      authorEmail: page.authorEmail || "",
    };

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (site.apiKey) headers["x-api-key"] = site.apiKey;

    let res: Response;
    try {
      res = await fetch(site.apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Không thể kết nối tới ${site.apiUrl} — ${cause}` },
        { status: 502 },
      );
    }

    const responseText = await res.text();
    let responseData: unknown;
    try { responseData = JSON.parse(responseText); } catch { responseData = responseText; }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Site trả về lỗi HTTP ${res.status}`, detail: responseData },
        { status: 502 },
      );
    }

    // Ghi lại lịch sử đăng bài
    await prisma.publishRecord.create({
      data: { pageId: params.id, siteId, siteName: site.name },
    });

    return NextResponse.json({ ok: true, response: responseData });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
