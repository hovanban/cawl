/**
 * GET /api/pages — list crawled pages with search, filter, pagination
 * Query params:
 *   jobId   — filter by job
 *   q       — search title or URL (case-insensitive)
 *   page    — page number (default 1)
 *   limit   — per page (default 20, max 100)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const jobId  = searchParams.get("jobId") ?? undefined;
  const q      = searchParams.get("q")?.trim() ?? undefined;
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const skip   = (page - 1) * limit;

  const where = {
    ...(jobId ? { jobId } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { url:   { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, pages] = await Promise.all([
    prisma.crawledPage.count({ where }),
    prisma.crawledPage.findMany({
      where,
      orderBy: { crawledAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        url: true,
        title: true,
        thumbnail: true,
        statusCode: true,
        error: true,
        crawledAt: true,
        aiResult: true,
        currentTitle: true,
        jobId: true,
        job: { select: { name: true } },
        publishRecords: { select: { siteName: true, publishedAt: true }, orderBy: { publishedAt: "desc" } },
      },
    }),
  ]);

  return NextResponse.json({
    pages,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
