/**
 * GET  /api/jobs — list all crawl jobs
 * POST /api/jobs — create a new crawl job
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleJob, unscheduleJob, validateCron } from "@/services/scheduler";

export async function GET() {
  const jobs = await prisma.crawlJob.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { pages: true, runs: true } },
      runs: { orderBy: { startedAt: "desc" }, take: 1 },
    },
  });
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    name,
    startUrl,
    maxDepth = 3,
    maxPages = 100,
    limitPosts = 20,
    rateLimit = 1000,
    concurrency = 3,
    schedule,
    aiEnabled = false,
    aiPrompt,
    translateBeforeRewrite = false,
    aiPromptId,
    publishUrl,
    publishApiKey,
    publishUserId,
    publishMartialArt,
    autoPublish = false,
    // Listing page selectors
    titleSelector,
    detailLinkSelector,
    imageListSelector,
    // Detail page selectors
    contentSelector,
    removeElementSelector,
    imageDetailSelector,
    videoSelector,
    // API mode
    apiToken,
    apiBaseUrl,
    apiArticleUrlField,
  } = body;

  if (!name || !startUrl) {
    return NextResponse.json({ error: "name and startUrl are required" }, { status: 400 });
  }

  try {
    new URL(startUrl);
  } catch {
    return NextResponse.json({ error: "startUrl must be a valid URL" }, { status: 400 });
  }

  if (schedule && !validateCron(schedule)) {
    return NextResponse.json({ error: "Invalid cron expression" }, { status: 400 });
  }

  const job = await prisma.crawlJob.create({
    data: {
      name,
      startUrl,
      maxDepth: Number(maxDepth),
      maxPages: Number(maxPages),
      limitPosts: Number(limitPosts),
      rateLimit: Number(rateLimit),
      concurrency: Number(concurrency),
      schedule: schedule || null,
      aiEnabled: Boolean(aiEnabled),
      aiPrompt: aiPrompt || null,
      translateBeforeRewrite: Boolean(translateBeforeRewrite),
      aiPromptId:        aiPromptId        || null,
      publishUrl:        publishUrl        || null,
      publishApiKey:     publishApiKey     || null,
      publishUserId:     publishUserId     || null,
      publishMartialArt: publishMartialArt || null,
      autoPublish:       Boolean(autoPublish),
      // Listing selectors
      titleSelector: titleSelector || null,
      detailLinkSelector: detailLinkSelector || null,
      imageListSelector: imageListSelector || null,
      // Detail selectors
      contentSelector: contentSelector || null,
      removeElementSelector: removeElementSelector || null,
      imageDetailSelector: imageDetailSelector || null,
      videoSelector: videoSelector || null,
      // API mode
      apiToken: apiToken || null,
      apiBaseUrl: apiBaseUrl || null,
      apiArticleUrlField: apiArticleUrlField || null,
    },
  });

  if (job.schedule) {
    scheduleJob(job.id, job.schedule);
  }

  return NextResponse.json(job, { status: 201 });
}
