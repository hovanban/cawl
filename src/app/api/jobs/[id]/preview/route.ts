/**
 * POST /api/jobs/[id]/preview — preview crawl a single page (no DB writes)
 * Body: { url?: string } — defaults to job's startUrl
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { previewCrawl } from "@/services/crawler";

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  const job = await prisma.crawlJob.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const targetUrl: string = body.url ?? job.startUrl;

  try {
    const result = await previewCrawl(targetUrl);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
