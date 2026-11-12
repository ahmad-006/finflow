import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { SessionPayload } from "./types";

export const SESSION_COOKIE_NAME = "finflow_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days in seconds

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET environment variable is missing in production");
    }
    return "finflow-secret-session-key-dev-32-chars-minimum";
  }
  return secret;
}

/**
 * Creates an HMAC-SHA256 signed session token from payload.
 * Structure: `${base64url(payload)}.${hmacSignature}`
 */
export function signSession(payload: SessionPayload, secret: string = getSessionSecret()): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 signed session token. Returns null if invalid or expired.
 */
export function verifySessionToken(token: string, secret: string = getSessionSecret()): SessionPayload | null {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [data, signature] = parts;
  if (!data || !signature) {
    return null;
  }

  try {
    const expectedSignature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      return null;
    }

    const raw = Buffer.from(data, "base64url").toString("utf-8");
    const payload = JSON.parse(raw) as SessionPayload;

    if (!payload.userId || !payload.companyId) {
      return null;
    }

    if (payload.expiresAt && payload.expiresAt < Date.now()) {
      return null; // Expired session
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Sets the signed session token into HTTP-only secure cookie.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Clears the session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Asynchronously reads the session token from cookies.
 */
export async function getSessionTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  return cookie?.value ?? null;
}
