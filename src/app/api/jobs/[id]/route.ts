/**
 * GET    /api/jobs/[id] — get job with pages & runs
 * PATCH  /api/jobs/[id] — update job
 * DELETE /api/jobs/[id] — delete job (cascades pages & runs)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleJob, unscheduleJob, validateCron } from "@/services/scheduler";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const job = await prisma.crawlJob.findUnique({
    where: { id: params.id },
    include: {
      runs: { orderBy: { startedAt: "desc" }, take: 5 },
      pages: { orderBy: { crawledAt: "desc" }, take: 50 },
      _count: { select: { pages: true, runs: true } },
    },
  });

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const body = await req.json();

  const existing = await prisma.crawlJob.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { schedule, ...rest } = body;

  if (schedule !== undefined && schedule !== null && !validateCron(schedule)) {
    return NextResponse.json({ error: "Invalid cron expression" }, { status: 400 });
  }

  // Ensure numeric fields are cast correctly
  const data: Record<string, unknown> = { ...rest, schedule: schedule !== undefined ? schedule : existing.schedule };
  if (data.maxDepth !== undefined) data.maxDepth = Number(data.maxDepth);
  if (data.maxPages !== undefined) data.maxPages = Number(data.maxPages);
  if (data.limitPosts !== undefined) data.limitPosts = Number(data.limitPosts);
  if (data.rateLimit !== undefined) data.rateLimit = Number(data.rateLimit);
  if (data.concurrency !== undefined) data.concurrency = Number(data.concurrency);

  // Coerce empty strings to null for optional selectors
  const selectorFields = [
    "titleSelector", "detailLinkSelector", "imageListSelector",
    "contentSelector", "removeElementSelector", "imageDetailSelector", "videoSelector", "commentSelector",
    "aiPrompt", "apiToken", "apiBaseUrl", "apiArticleUrlField",
    "email", "martialArt",
  ];
  for (const field of selectorFields) {
    if (data[field] === "") data[field] = null;
  }

  const job = await prisma.crawlJob.update({
    where: { id: params.id },
    data,
  });

  unscheduleJob(job.id);
  if (job.schedule) scheduleJob(job.id, job.schedule);

  return NextResponse.json(job);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const existing = await prisma.crawlJob.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  unscheduleJob(params.id);
  await prisma.crawlJob.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
