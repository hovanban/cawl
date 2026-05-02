/**
 * GET /api/pages/[id] — get full content of a single crawled page
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const page = await prisma.crawledPage.findUnique({
    where: { id: params.id },
    include: {
      job: { select: { name: true, aiPrompt: true } },
      publishRecords: { select: { siteName: true, publishedAt: true }, orderBy: { publishedAt: "desc" } },
    },
  });

  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(page);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await prisma.crawledPage.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const body = await req.json();
  const allowed = ["currentTitle", "currentContent", "currentDescription", "martialArt", "authorEmail"] as const;

  type AllowedKey = typeof allowed[number];
  const data: Partial<Record<AllowedKey, string>> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const updated = await prisma.crawledPage.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ ok: true, id: updated.id });
}
