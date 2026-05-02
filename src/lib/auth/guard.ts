/**
 * Reusable guards for API route handlers (Node.js runtime).
 * Usage:
 *   const user = await requireAuth(req);
 *   requirePermission(user, "post.create");
 */

import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken, verifyAccessToken, type TokenPayload } from "./jwt";
import { hasAllPermissions } from "./permissions";

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

export async function getAuthUser(req: NextRequest): Promise<TokenPayload | null> {
  // Cookie (browser) takes priority, fallback to Authorization header (API clients)
  const token =
    req.cookies.get("accessToken")?.value ??
    extractBearerToken(req.headers.get("authorization"));
  if (!token) return null;
  try {
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(req: NextRequest): Promise<TokenPayload> {
  const user = await getAuthUser(req);
  if (!user) throw new AuthError(401, "Chưa đăng nhập");
  return user;
}

export function requireRole(user: TokenPayload, roles: string[]): void {
  if (!roles.includes(user.role)) {
    throw new AuthError(403, "Không có quyền truy cập");
  }
}

export function requirePermission(user: TokenPayload, ...permissions: string[]): void {
  if (!hasAllPermissions(user.permissions, permissions)) {
    throw new AuthError(403, `Thiếu quyền: ${permissions.join(", ")}`);
  }
}

// Wrap a handler with automatic auth error handling
export function withGuard(
  handler: (req: NextRequest, ctx: { user: TokenPayload }) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    try {
      const user = await requireAuth(req);
      return await handler(req, { user });
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }
  };
}
