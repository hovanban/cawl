import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { ROLE_PERMISSIONS } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email và mật khẩu là bắt buộc" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Constant-time check to prevent user enumeration
    const passwordOk = user ? await verifyPassword(password, user.password) : false;

    if (!user || !passwordOk) {
      return NextResponse.json({ error: "Email hoặc mật khẩu không đúng" }, { status: 401 });
    }
    if (!user.isActive) {
      return NextResponse.json({ error: "Tài khoản đã bị vô hiệu hóa" }, { status: 403 });
    }

    // User-level overrides take priority; otherwise read from DB Role; fallback to hardcoded defaults
    let rolePerms: string[] = ROLE_PERMISSIONS[user.role] ?? [];
    if (user.permissions.length === 0) {
      const dbRole = await prisma.role.findUnique({ where: { name: user.role } });
      if (dbRole) rolePerms = dbRole.permissions;
    }
    const permissions = user.permissions.length > 0 ? user.permissions : rolePerms;
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, email: user.email, role: user.role, permissions }),
      signRefreshToken(user.id),
    ]);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const res = NextResponse.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions },
    });

    // Set httpOnly cookie for browser-based auth (middleware reads this)
    res.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    });
    res.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
