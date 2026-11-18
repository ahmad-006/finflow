import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getUserWithCompany } from "./service";
import type { SessionPayload, SafeUser } from "./types";

export const SESSION_COOKIE_NAME = "finflow_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days in seconds

export function getSessionSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "finflow-secret-session-key-dev-32-chars-minimum";
  return new TextEncoder().encode(secret);
}

/**
 * Creates an industry-standard signed JWT session token.
 */
export async function signSession(
  payload: SessionPayload,
  secretKey: Uint8Array = getSessionSecretKey()
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey);
}

/**
 * Verifies a signed JWT session token. Returns payload or null if invalid/expired.
 */
export async function verifySessionToken(
  token: string,
  secretKey: Uint8Array = getSessionSecretKey()
): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string") {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (!payload.userId || !payload.companyId) {
      return null;
    }
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Sets the signed session token into an HTTP-only secure cookie.
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
 * Clears the session cookie on logout.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Reads the session token string from cookies.
 */
export async function getSessionTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * Deduplicated session lookup (React.cache).
 * Within a single request render tree, verifies JWT only once.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  try {
    const token = await getSessionTokenFromCookies();
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
});

/**
 * Deduplicated user & company lookup (React.cache).
 * Within a single request render tree, queries Neon DB only once.
 */
export const getCurrentUser = cache(
  async (): Promise<(SafeUser & { company: { id: string; name: string; baseCurrency: string } }) | null> => {
    try {
      const session = await getSession();
      if (!session) return null;
      return (await getUserWithCompany(session.userId)) as (SafeUser & {
        company: { id: string; name: string; baseCurrency: string };
      }) | null;
    } catch {
      return null;
    }
  }
);
