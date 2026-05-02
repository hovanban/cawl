import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sites = await prisma.publishSite.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(sites);
}

export async function POST(req: NextRequest) {
  const { name, apiUrl, apiKey } = await req.json();
  if (!name?.trim() || !apiUrl?.trim()) {
    return NextResponse.json({ error: "name và apiUrl là bắt buộc" }, { status: 400 });
  }
  const site = await prisma.publishSite.create({
    data: { name: name.trim(), apiUrl: apiUrl.trim(), apiKey: (apiKey ?? "").trim() },
  });
  return NextResponse.json(site, { status: 201 });
}
