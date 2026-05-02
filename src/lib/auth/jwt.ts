import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const ACCESS_SECRET  = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET  ?? "change-me-access");
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET ?? "change-me-refresh");

export interface TokenPayload extends JWTPayload {
  sub: string;       // userId
  email: string;
  role: string;
  permissions: string[];
}

export async function signAccessToken(payload: Omit<TokenPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(ACCESS_SECRET);
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId } as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET);
  return payload as TokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, REFRESH_SECRET);
  return payload as { sub: string };
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
