import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission, AuthError } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";

type Params = { params: { id: string } };

const USER_SELECT = {
  id: true, email: true, name: true, role: true,
  permissions: true, isActive: true, createdAt: true,
};

// GET /api/users/:id — require "user.read" OR own profile
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const me = await requireAuth(req);
    if (me.sub !== params.id) requirePermission(me, "user.read");

    const user = await prisma.user.findUnique({ where: { id: params.id }, select: USER_SELECT });
    if (!user) return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });

    return NextResponse.json(user);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/users/:id — require "user.update" OR own profile (limited fields)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const me = await requireAuth(req);
    const isOwn = me.sub === params.id;

    if (!isOwn) requirePermission(me, "user.update");

    const body = await req.json();
    const data: Record<string, unknown> = {};

    // Fields anyone can update on their own profile
    if (body.name     !== undefined) data.name = body.name;
    if (body.password !== undefined) data.password = await hashPassword(body.password);

    // Admin-only fields
    if (me.role === "admin") {
      if (body.role        !== undefined) data.role        = body.role;
      if (body.permissions !== undefined) data.permissions = body.permissions;
      if (body.isActive    !== undefined) data.isActive    = body.isActive;
    } else if (body.role || body.permissions || body.isActive !== undefined) {
      // Non-admin trying to escalate — silently ignore sensitive fields
      return NextResponse.json({ error: "Không được thay đổi role hoặc permissions" }, { status: 403 });
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: USER_SELECT,
    });

    return NextResponse.json(user);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/users/:id — require "user.delete"
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const me = await requireAuth(req);
    requirePermission(me, "user.delete");

    // Prevent self-delete
    if (me.sub === params.id) {
      return NextResponse.json({ error: "Không thể xóa chính mình" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
