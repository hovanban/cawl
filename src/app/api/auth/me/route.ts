import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/lib/auth/guard";

export async function GET(req: NextRequest) {
  try {
    const me = await requireAuth(req);
    const user = await prisma.user.findUnique({
      where: { id: me.sub },
      select: { id: true, email: true, name: true, role: true, permissions: true, isActive: true },
    });
    if (!user) return NextResponse.json({ error: "User không tồn tại" }, { status: 404 });
    return NextResponse.json({ ...user, effectivePermissions: me.permissions });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
