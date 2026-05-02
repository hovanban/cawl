import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission, AuthError } from "@/lib/auth/guard";

export async function GET(req: NextRequest) {
  try {
    const me = await requireAuth(req);
    requirePermission(me, "role.read");
    const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(roles);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireAuth(req);
    requirePermission(me, "role.create");
    const { name, permissions } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Tên role là bắt buộc" }, { status: 400 });

    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) return NextResponse.json({ error: "Role đã tồn tại" }, { status: 409 });

    const role = await prisma.role.create({ data: { name: name.trim(), permissions: permissions ?? [] } });
    return NextResponse.json(role, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
