import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { name, apiUrl, apiKey } = await req.json();
  if (!name?.trim() || !apiUrl?.trim()) {
    return NextResponse.json({ error: "name và apiUrl là bắt buộc" }, { status: 400 });
  }
  const site = await prisma.publishSite.update({
    where: { id: params.id },
    data: { name: name.trim(), apiUrl: apiUrl.trim(), apiKey: (apiKey ?? "").trim() },
  });
  return NextResponse.json(site);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await prisma.publishSite.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
