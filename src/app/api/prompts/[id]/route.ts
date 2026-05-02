/**
 * GET    /api/prompts/[id]
 * PATCH  /api/prompts/[id]
 * DELETE /api/prompts/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const prompt = await prisma.aiPrompt.findUnique({ where: { id: params.id } });
  if (!prompt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(prompt);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const existing = await prisma.aiPrompt.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const fields = ["name", "systemRole", "titleTemplate", "contentTemplate", "descriptionTemplate", "titleDescriptionTemplate"];
  const data: Record<string, string> = {};
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = body[f];
  }

  const prompt = await prisma.aiPrompt.update({ where: { id: params.id }, data });
  return NextResponse.json(prompt);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const existing = await prisma.aiPrompt.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.aiPrompt.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
