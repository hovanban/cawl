/**
 * POST /api/preview — preview a URL without a job (used from job creation form)
 * Body: { url: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { previewCrawl } from "@/services/crawler";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { url } = body;

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const result = await previewCrawl(url);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
