/**
 * GET  /api/prompts — list all prompts
 * POST /api/prompts — create a prompt
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const prompts = await prisma.aiPrompt.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(prompts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, systemRole = "", titleTemplate = "", contentTemplate = "", descriptionTemplate = "", commentTemplate = "", titleDescriptionTemplate = "" } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const prompt = await prisma.aiPrompt.create({
    data: { name, systemRole, titleTemplate, contentTemplate, descriptionTemplate, commentTemplate, titleDescriptionTemplate },
  });
  return NextResponse.json(prompt, { status: 201 });
}
