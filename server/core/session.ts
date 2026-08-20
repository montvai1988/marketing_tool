import { jwtVerify, SignJWT } from "jose";
import type { Request } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import { ENV, requireEnv } from "./env";

const encoder = new TextEncoder();
export type SessionPayload = { openId: string };

function key() {
  return encoder.encode(requireEnv(ENV.sessionSecret, "SESSION_SECRET"));
}

export async function createSession(openId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(openId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key());
}

export async function readSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token || !ENV.sessionSecret) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return typeof payload.sub === "string" ? { openId: payload.sub } : null;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(req: Request) {
  const forwarded = req.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const secure = ENV.isProduction || protocol === "https" || req.protocol === "https";
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: ONE_YEAR_MS };
}

export { COOKIE_NAME };
