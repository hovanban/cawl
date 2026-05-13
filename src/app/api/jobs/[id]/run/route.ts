/**
 * POST /api/jobs/[id]/run — manually trigger a crawl job
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runCrawl } from "@/services/crawler";

type Params = { params: { id: string } };

export async function POST(_req: NextRequest, { params }: Params) {
  const job = await prisma.crawlJob.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (job.status === "RUNNING") {
    return NextResponse.json({ error: "Job is already running" }, { status: 409 });
  }

  const run = await prisma.crawlRun.create({ data: { jobId: job.id } });

  runCrawl({
    jobId: job.id,
    runId: run.id,
    startUrl: job.startUrl,
    maxDepth: job.maxDepth,
    limitPosts: job.limitPosts,
    rateLimit: job.rateLimit,
    concurrency: job.concurrency,
    authorEmail: job.email      ?? undefined,
    martialArt:  job.martialArt ?? undefined,
    selectors: {
      detailLinkSelector:    job.detailLinkSelector    ?? undefined,
      titleSelector:         job.titleSelector         ?? undefined,
      imageListSelector:     job.imageListSelector     ?? undefined,
      contentSelector:       job.contentSelector       ?? undefined,
      removeElementSelector: job.removeElementSelector ?? undefined,
      imageDetailSelector:   job.imageDetailSelector   ?? undefined,
      videoSelector:         job.videoSelector         ?? undefined,
      commentSelector:       job.commentSelector       ?? undefined,
    },
    api: (job.apiToken || job.apiBaseUrl) ? {
      token:           job.apiToken           ?? undefined,
      baseUrl:         job.apiBaseUrl         ?? undefined,
      articleUrlField: job.apiArticleUrlField ?? undefined,
    } : undefined,
  }).catch(async (err) => {
    console.error(`[run] Job ${job.id} failed:`, err);
    await prisma.crawlRun.update({
      where: { id: run.id },
      data: { status: "FAILED", finishedAt: new Date() },
    });
    await prisma.crawlJob.update({
      where: { id: job.id },
      data: { status: "FAILED" },
    });
  });

  return NextResponse.json({ runId: run.id }, { status: 202 });
}
