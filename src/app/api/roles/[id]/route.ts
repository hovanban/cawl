import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission, AuthError } from "@/lib/auth/guard";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const me = await requireAuth(req);
    requirePermission(me, "role.update");
    const { name, permissions } = await req.json();
    const data: Record<string, unknown> = {};
    if (name        !== undefined) data.name        = name.trim();
    if (permissions !== undefined) data.permissions = permissions;
    const role = await prisma.role.update({ where: { id: params.id }, data });
    return NextResponse.json(role);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const me = await requireAuth(req);
    requirePermission(me, "role.delete");
    await prisma.role.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
