import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const refreshToken = body.refreshToken ?? req.cookies.get("refreshToken")?.value;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
  } catch { /* silent */ }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete("accessToken");
  res.cookies.delete("refreshToken");
  return res;
}
