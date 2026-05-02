/**
 * GET /api/stats — aggregated dashboard statistics
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [totalJobs, totalPages, totalRuns, recentRuns, jobsByStatus] =
    await Promise.all([
      prisma.crawlJob.count(),
      prisma.crawledPage.count(),
      prisma.crawlRun.count(),
      prisma.crawlRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 5,
        include: { job: { select: { name: true } } },
      }),
      prisma.crawlJob.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ]);

  const pagesWithAI = await prisma.crawledPage.count({
    where: { aiResult: { not: null } },
  });

  return NextResponse.json({
    totalJobs,
    totalPages,
    totalRuns,
    pagesWithAI,
    jobsByStatus: Object.fromEntries(
      jobsByStatus.map((g) => [g.status, g._count.status])
    ),
    recentRuns,
  });
}
