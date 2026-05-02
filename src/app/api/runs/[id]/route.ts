/**
 * GET /api/runs/[id] — get run status (for polling)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const run = await prisma.crawlRun.findUnique({
    where: { id: params.id },
    include: {
      job: { select: { name: true } },
      pages: { orderBy: { crawledAt: "desc" }, take: 10 },
    },
  });

  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(run);
}
