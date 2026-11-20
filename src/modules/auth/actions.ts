"use server";

import { redirect } from "next/navigation";
import { formatUserError } from "@/lib/errors";
import {
  registerUser,
  registerUserAndCompany,
  loginUser,
  getUserWithCompany,
  verifySignupOtp,
  resendSignupOtp,
  requestPasswordReset,
  resetPasswordWithOtp,
} from "./service";
import {
  setSessionCookie,
  clearSessionCookie,
  getSessionTokenFromCookies,
  verifySessionToken,
  getSession,
  getCurrentUser,
  createSessionToken,
  SESSION_MAX_AGE_SECONDS,
} from "./session";
import type { RegisterInput, LoginInput, AuthActionResult, SessionPayload, SafeUser } from "./types";
import {
  verifyEmailSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./validation";

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

function getErrorMessage(err: unknown, fallback: string): string {
  if (
    err instanceof Error &&
    err.message &&
    !err.message.includes("PrismaClient") &&
    !err.message.includes("database") &&
    !err.message.includes("postgres://")
  ) {
    return err.message;
  }
  return formatUserError(err, fallback);
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
 * issues the HTTP-only signed session cookie, and redirects to /verify-email.
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

    const sessionData = await registerUser(input);
    await setSessionCookie(sessionData.token);

    if (!input.noRedirect) {
      redirect("/verify-email");
    }

    return {
      success: true,
      data: sessionData,
      redirectUrl: "/verify-email",
    };
  } catch (err: unknown) {
    if (isRedirectError(err)) {
      throw err;
    }

    const message = getErrorMessage(err, "Registration failed. Please check your inputs.");
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

    const redirectTarget = sessionData.user.emailVerified ? "/dashboard" : "/verify-email";

    if (!input.noRedirect) {
      redirect(redirectTarget);
    }

    return {
      success: true,
      data: sessionData,
      redirectUrl: redirectTarget,
    };
  } catch (err: unknown) {
    if (isRedirectError(err)) {
      throw err;
    }

    const message = getErrorMessage(err, "Invalid credentials. Please try again.");
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Server Action: Verifies 6-digit email signup OTP, sets updated verified session cookie,
 * and redirects to /dashboard.
 */
export async function verifyEmailAction(
  prevStateOrData: unknown,
  formDataOrUndefined?: FormData
): Promise<AuthActionResult> {
  try {
    const rawData = formDataOrUndefined
      ? extractData(formDataOrUndefined)
      : extractData(prevStateOrData);

    const currentSession = await getSession();
    const rawEmail = String(rawData.email || currentSession?.email || "").trim();
    const rawCode = String(rawData.code || rawData.otp || "").trim();
    const noRedirect = Boolean(rawData.noRedirect);

    const validated = verifyEmailSchema.parse({
      email: rawEmail,
      code: rawCode,
      noRedirect,
    });

    const user = await verifySignupOtp(validated.email, validated.code);

    // Issue updated session token reflecting emailVerified = true
    const sessionPayload: SessionPayload = {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      emailVerified: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    };

    const token = await createSessionToken(sessionPayload);
    await setSessionCookie(token);

    if (!validated.noRedirect) {
      redirect("/dashboard");
    }

    return {
      success: true,
      redirectUrl: "/dashboard",
      data: { emailVerified: true },
    };
  } catch (err: unknown) {
    if (isRedirectError(err)) {
      throw err;
    }

    const message = getErrorMessage(err, "Verification failed. Please check the code.");
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Server Action: Resends signup verification OTP with 60-second rate limiting.
 */
export async function resendOtpAction(
  prevStateOrData: unknown,
  formDataOrUndefined?: FormData
): Promise<AuthActionResult> {
  try {
    const rawData = formDataOrUndefined
      ? extractData(formDataOrUndefined)
      : extractData(prevStateOrData);

    const currentSession = await getSession();
    const rawEmail = String(rawData.email || currentSession?.email || "").trim();

    const validated = resendOtpSchema.parse({ email: rawEmail });
    await resendSignupOtp(validated.email);

    return {
      success: true,
      data: { message: "A new 6-digit verification code has been dispatched." },
    };
  } catch (err: unknown) {
    if (isRedirectError(err)) {
      throw err;
    }

    const message = getErrorMessage(err, "Failed to resend code.");
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Server Action: Initiates password reset for the specified email address.
 */
export async function forgotPasswordAction(
  prevStateOrData: unknown,
  formDataOrUndefined?: FormData
): Promise<AuthActionResult> {
  try {
    const rawData = formDataOrUndefined
      ? extractData(formDataOrUndefined)
      : extractData(prevStateOrData);

    const rawEmail = String(rawData.email || "").trim();
    const validated = forgotPasswordSchema.parse({ email: rawEmail });

    const result = await requestPasswordReset(validated.email);

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    if (isRedirectError(err)) {
      throw err;
    }

    const message = getErrorMessage(err, "Password reset request failed.");
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Server Action: Resets user password using 6-digit OTP and redirects to /login?reset=success.
 */
export async function resetPasswordAction(
  prevStateOrData: unknown,
  formDataOrUndefined?: FormData
): Promise<AuthActionResult> {
  try {
    const rawData = formDataOrUndefined
      ? extractData(formDataOrUndefined)
      : extractData(prevStateOrData);

    const input = {
      email: String(rawData.email || "").trim(),
      code: String(rawData.code || rawData.otp || "").trim(),
      newPassword: rawData.newPassword ? String(rawData.newPassword) : undefined,
      password: rawData.password ? String(rawData.password) : undefined,
      confirmPassword: rawData.confirmPassword ? String(rawData.confirmPassword) : undefined,
      noRedirect: Boolean(rawData.noRedirect),
    };

    const validated = resetPasswordSchema.parse(input);
    const targetPassword = (validated.newPassword || validated.password)!;

    if (validated.confirmPassword && validated.confirmPassword !== targetPassword) {
      return {
        success: false,
        error: "Passwords do not match.",
      };
    }

    const result = await resetPasswordWithOtp(validated.email, validated.code, targetPassword);

    if (!validated.noRedirect) {
      redirect("/login?reset=success");
    }

    return {
      success: true,
      data: result,
      redirectUrl: "/login?reset=success",
    };
  } catch (err: unknown) {
    if (isRedirectError(err)) {
      throw err;
    }

    const message = getErrorMessage(err, "Failed to reset password.");
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
