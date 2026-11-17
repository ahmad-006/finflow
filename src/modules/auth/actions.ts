"use server";

import { redirect } from "next/navigation";
import { registerUserAndCompany, loginUser, getUserWithCompany } from "./service";
import {
  setSessionCookie,
  clearSessionCookie,
  getSessionTokenFromCookies,
  verifySessionToken,
  getSession,
  getCurrentUser,
} from "./session";
import type { RegisterInput, LoginInput, AuthActionResult, SessionPayload, SafeUser } from "./types";

function extractData(input: unknown): Record<string, unknown> {
  if (input instanceof FormData) {
    const obj: Record<string, unknown> = {};
    for (const [key, val] of input.entries()) {
      obj[key] = val;
    }
    return obj;
  }
  if (typeof input === "object" && input !== null) {
    return input as Record<string, unknown>;
  }
  return {};
}

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest: unknown }).digest === "string" &&
    ((err as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (err as { digest: string }).digest.startsWith("BAILOUT_TO_CLIENT_SIDE_RENDERING"))
  );
}

/**
 * Server Action: Registers a new Company and User (OWNER) in a single Prisma transaction,
 * issues the HTTP-only signed session cookie, and redirects to /dashboard.
 */
export async function registerAction(
  prevStateOrData: unknown,
  formDataOrUndefined?: FormData
): Promise<AuthActionResult> {
  try {
    const rawData = formDataOrUndefined
      ? extractData(formDataOrUndefined)
      : extractData(prevStateOrData);

    const input: RegisterInput = {
      companyName: String(rawData.companyName || rawData.name || "").trim(),
      fullName: String(rawData.fullName || rawData.userName || "").trim(),
      email: String(rawData.email || "").trim(),
      password: String(rawData.password || ""),
      baseCurrency: rawData.baseCurrency ? String(rawData.baseCurrency).trim() : undefined,
      liquidReserve: (rawData.liquidReserve ?? rawData.openingCash ?? 0) as string | number,
      safetyBuffer: (rawData.safetyBuffer ?? 0) as string | number,
      noRedirect: Boolean(rawData.noRedirect),
    };

    const sessionData = await registerUserAndCompany(input);
    await setSessionCookie(sessionData.token);

    if (!input.noRedirect) {
      redirect("/dashboard");
    }

    return {
      success: true,
      data: sessionData,
      redirectUrl: "/dashboard",
    };
  } catch (err: unknown) {
    if (isRedirectError(err)) {
      throw err;
    }

    const message = err instanceof Error ? err.message : "Registration failed. Please check your inputs.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Server Action: Verifies user credentials, sets HTTP-only signed session cookie, and redirects to /dashboard.
 */
export async function loginAction(
  prevStateOrData: unknown,
  formDataOrUndefined?: FormData
): Promise<AuthActionResult> {
  try {
    const rawData = formDataOrUndefined
      ? extractData(formDataOrUndefined)
      : extractData(prevStateOrData);

    const input: LoginInput = {
      email: String(rawData.email || "").trim(),
      password: String(rawData.password || ""),
      noRedirect: Boolean(rawData.noRedirect),
    };

    const sessionData = await loginUser(input);
    await setSessionCookie(sessionData.token);

    if (!input.noRedirect) {
      redirect("/dashboard");
    }

    return {
      success: true,
      data: sessionData,
      redirectUrl: "/dashboard",
    };
  } catch (err: unknown) {
    if (isRedirectError(err)) {
      throw err;
    }

    const message = err instanceof Error ? err.message : "Invalid credentials. Please try again.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Server Action: Clears the session cookie and redirects to /login.
 */
export async function logoutAction(options?: { noRedirect?: boolean }): Promise<AuthActionResult> {
  try {
    await clearSessionCookie();

    if (!options?.noRedirect) {
      redirect("/login");
    }

    return {
      success: true,
      redirectUrl: "/login",
    };
  } catch (err: unknown) {
    if (isRedirectError(err)) {
      throw err;
    }

    const message = err instanceof Error ? err.message : "Logout failed.";
    return {
      success: false,
      error: message,
    };
  }
}

// Re-export memoized DAL functions
export { getSession, getCurrentUser };

/**
 * Guard: Requires active authentication or redirects to /login.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
