/**
 * GET  /api/settings        — get all settings as { key: value } map
 * PATCH /api/settings       — upsert settings, body: { key: value, ... }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.appSetting.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return NextResponse.json(map);
}

export async function PATCH(req: NextRequest) {
  const body: Record<string, string> = await req.json();
  const ops = Object.entries(body).map(([key, value]) =>
    prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  );
  await Promise.all(ops);
  return NextResponse.json({ ok: true });
}
