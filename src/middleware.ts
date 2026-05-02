import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken, verifyAccessToken } from "@/lib/auth/jwt";
import { hasPermission } from "@/lib/auth/permissions";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/register", "/api/auth/refresh"];

const API_PERMISSION_MAP: { pattern: RegExp; permissions: Partial<Record<string, string>> }[] = [
  // Articles
  { pattern: /^\/api\/pages$/,                         permissions: { GET: "article.read",   POST: "article.create" } },
  { pattern: /^\/api\/pages\/[^/]+$/,                  permissions: { GET: "article.read",   PATCH: "article.update", DELETE: "article.delete" } },
  { pattern: /^\/api\/pages\/[^/]+\/translate$/,       permissions: { POST: "article.translate" } },
  { pattern: /^\/api\/pages\/[^/]+\/ai-preview$/,      permissions: { POST: "article.rewrite" } },
  { pattern: /^\/api\/pages\/[^/]+\/publish$/,         permissions: { POST: "article.publish" } },
  { pattern: /^\/api\/preview$/,                       permissions: { GET: "article.read" } },
  { pattern: /^\/api\/stats$/,                         permissions: { GET: "article.read" } },

  // Jobs
  { pattern: /^\/api\/jobs$/,                          permissions: { GET: "job.read", POST: "job.create" } },
  { pattern: /^\/api\/jobs\/[^/]+$/,                   permissions: { GET: "job.read", PATCH: "job.update", DELETE: "job.delete" } },
  { pattern: /^\/api\/jobs\/[^/]+\/run$/,              permissions: { POST: "job.run" } },
  { pattern: /^\/api\/jobs\/[^/]+\/preview$/,          permissions: { GET: "job.read" } },
  { pattern: /^\/api\/runs\/[^/]+$/,                   permissions: { GET: "job.read" } },

  // Sites
  { pattern: /^\/api\/sites$/,                         permissions: { GET: "site.read", POST: "site.create" } },
  { pattern: /^\/api\/sites\/[^/]+$/,                  permissions: { GET: "site.read", PATCH: "site.update", DELETE: "site.delete" } },

  // Prompts
  { pattern: /^\/api\/prompts$/,                       permissions: { GET: "prompt.read", POST: "prompt.create" } },
  { pattern: /^\/api\/prompts\/[^/]+$/,                permissions: { GET: "prompt.read", PATCH: "prompt.update", DELETE: "prompt.delete" } },

  // Settings
  { pattern: /^\/api\/settings$/,                      permissions: { GET: "settings.read", PATCH: "settings.update" } },

  // Users
  { pattern: /^\/api\/users$/,                         permissions: { GET: "user.read", POST: "user.create" } },
  { pattern: /^\/api\/users\/[^/]+$/,                  permissions: { GET: "user.read", PATCH: "user.update", DELETE: "user.delete" } },

  // Roles
  { pattern: /^\/api\/roles$/,                         permissions: { GET: "role.read", POST: "role.create" } },
  { pattern: /^\/api\/roles\/[^/]+$/,                  permissions: { PATCH: "role.update", DELETE: "role.delete" } },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const cookieToken = req.cookies.get("accessToken")?.value;
  const headerToken = extractBearerToken(req.headers.get("authorization"));
  const token = cookieToken ?? headerToken ?? null;

  const isApiRoute  = pathname.startsWith("/api/");
  const isPageRoute = !isApiRoute;

  if (!token) {
    if (isPageRoute) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  let payload;
  try {
    payload = await verifyAccessToken(token);
  } catch {
    if (isPageRoute) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete("accessToken");
      return res;
    }
    return NextResponse.json({ error: "Token không hợp lệ hoặc đã hết hạn" }, { status: 401 });
  }

  if (isApiRoute) {
    const route = API_PERMISSION_MAP.find((r) => r.pattern.test(pathname));
    if (route) {
      const required = route.permissions[req.method];
      if (required && !hasPermission(payload.permissions, required)) {
        return NextResponse.json({ error: `Thiếu quyền: ${required}` }, { status: 403 });
      }
    }
  }

  const headers = new Headers(req.headers);
  headers.set("x-user-id",          payload.sub);
  headers.set("x-user-role",        payload.role);
  headers.set("x-user-permissions", payload.permissions.join(","));

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
