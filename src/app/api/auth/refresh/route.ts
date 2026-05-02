import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { resolvePermissions } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    if (!refreshToken) {
      return NextResponse.json({ error: "refreshToken là bắt buộc" }, { status: 400 });
    }

    // Verify signature + expiry
    let payload: { sub: string };
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      return NextResponse.json({ error: "Token không hợp lệ hoặc đã hết hạn" }, { status: 401 });
    }

    // Check token exists in DB (rotation: each refresh token used only once)
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      return NextResponse.json({ error: "Token không hợp lệ hoặc đã hết hạn" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Tài khoản không tồn tại hoặc đã bị khóa" }, { status: 401 });
    }

    // Rotate: delete old, issue new
    const [newAccessToken, newRefreshToken] = await Promise.all([
      signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        permissions: resolvePermissions(user.role, user.permissions),
      }),
      signRefreshToken(user.id),
    ]);

    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { token: refreshToken } }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return NextResponse.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
