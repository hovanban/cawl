import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission, AuthError } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { resolvePermissions } from "@/lib/auth/permissions";

const USER_SELECT = {
  id: true, email: true, name: true, role: true,
  permissions: true, isActive: true, createdAt: true,
};

// GET /api/users — require "user.read"
export async function GET(req: NextRequest) {
  try {
    const me = await requireAuth(req);
    requirePermission(me, "user.read");

    const { searchParams } = req.nextUrl;
    const page  = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
    const skip  = (page - 1) * limit;

    const [total, users] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({ skip, take: limit, select: USER_SELECT, orderBy: { createdAt: "desc" } }),
    ]);

    return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/users — require "user.create" (admin creates users)
export async function POST(req: NextRequest) {
  try {
    const me = await requireAuth(req);
    requirePermission(me, "user.create");

    const { email, password, name, role, permissions } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email và mật khẩu là bắt buộc" }, { status: 400 });
    }

    // Prevent privilege escalation: only admin can assign admin role
    if (role === "admin" && me.role !== "admin") {
      return NextResponse.json({ error: "Không thể gán quyền admin" }, { status: 403 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email đã tồn tại" }, { status: 409 });

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name: name ?? "",
        role: role ?? "user",
        permissions: permissions ?? [],
      },
      select: USER_SELECT,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
