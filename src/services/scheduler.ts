/**
 * scheduler.ts
 * Cron-based job scheduler using node-cron.
 * - Reads scheduled jobs from DB on startup
 * - Dynamically registers/deregisters cron tasks as jobs are created/updated
 * - Each task creates a CrawlRun and delegates to the crawler
 */

import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { runCrawl } from "./crawler";

// Registry of active cron tasks keyed by job ID
const activeTasks = new Map<string, cron.ScheduledTask>();

// Launches a crawl run for a given job
async function triggerJob(jobId: string): Promise<void> {
  const job = await prisma.crawlJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  if (job.status === "RUNNING") {
    console.log(`[scheduler] Job ${jobId} already running, skipping`);
    return;
  }

  const run = await prisma.crawlRun.create({ data: { jobId } });

  try {
    await runCrawl({
      jobId,
      runId: run.id,
      startUrl: job.startUrl,
      maxDepth: job.maxDepth,
      limitPosts: job.limitPosts,
      rateLimit: job.rateLimit,
      concurrency: job.concurrency,
      authorEmail: job.email       ?? undefined,
      martialArt:  job.martialArt  ?? undefined,
      selectors: {
        detailLinkSelector:    job.detailLinkSelector    ?? undefined,
        titleSelector:         job.titleSelector         ?? undefined,
        imageListSelector:     job.imageListSelector     ?? undefined,
        contentSelector:       job.contentSelector       ?? undefined,
        removeElementSelector: job.removeElementSelector ?? undefined,
        imageDetailSelector:   job.imageDetailSelector   ?? undefined,
        videoSelector:         job.videoSelector         ?? undefined,
      },
      api: (job.apiToken || job.apiBaseUrl) ? {
        token:           job.apiToken           ?? undefined,
        baseUrl:         job.apiBaseUrl         ?? undefined,
        articleUrlField: job.apiArticleUrlField ?? undefined,
      } : undefined,
    });
  } catch (err) {
    console.error(`[scheduler] Job ${jobId} failed:`, err);
    await prisma.crawlRun.update({
      where: { id: run.id },
      data: { status: "FAILED", finishedAt: new Date() },
    });
    await prisma.crawlJob.update({
      where: { id: jobId },
      data: { status: "FAILED" },
    });
  }
}

// Registers a cron task for a job
export function scheduleJob(jobId: string, cronExpression: string): void {
  unscheduleJob(jobId);

  if (!cron.validate(cronExpression)) {
    console.warn(`[scheduler] Invalid cron expression for job ${jobId}: ${cronExpression}`);
    return;
  }

  const task = cron.schedule(cronExpression, () => {
    triggerJob(jobId).catch(console.error);
  });

  activeTasks.set(jobId, task);
  console.log(`[scheduler] Registered job ${jobId} with schedule: ${cronExpression}`);
}

// Removes a job's cron task
export function unscheduleJob(jobId: string): void {
  const existing = activeTasks.get(jobId);
  if (existing) {
    existing.stop();
    activeTasks.delete(jobId);
    console.log(`[scheduler] Unregistered job ${jobId}`);
  }
}

// Bootstraps all scheduled jobs from the database on server start
export async function initScheduler(): Promise<void> {
  const jobs = await prisma.crawlJob.findMany({
    where: { schedule: { not: null } },
  });

  for (const job of jobs) {
    if (job.schedule) {
      scheduleJob(job.id, job.schedule);
    }
  }

  console.log(`[scheduler] Initialised with ${jobs.length} scheduled job(s)`);
}

// Validates a cron expression string
export function validateCron(expression: string): boolean {
  return cron.validate(expression);
}
