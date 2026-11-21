import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeGoogleCode,
  getGoogleUserInfo,
  handleGoogleLoginOrSignup,
  OAUTH_STATE_COOKIE_NAME,
} from "@/modules/auth/oauth";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/modules/auth/session";


function getCookieValue(request: Request | NextRequest, name: string): string | undefined {
  if ("cookies" in request && typeof (request as NextRequest).cookies?.get === "function") {
    return (request as NextRequest).cookies.get(name)?.value;
  }
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function getRedirectUrl(request: Request | NextRequest, pathAndQuery: string): URL {
  const url = "nextUrl" in request ? (request as NextRequest).nextUrl : new URL(request.url);
  const hostHeader =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    url.host ||
    "localhost:3000";
  const host = hostHeader.split(",")[0].trim();
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const proto =
    request.headers.get("x-forwarded-proto") || (isLocal ? "http" : "https");
  return new URL(pathAndQuery, `${proto}://${host}`);
}

export async function GET(request: Request | NextRequest) {
  const url = "nextUrl" in request ? (request as NextRequest).nextUrl : new URL(request.url);
  const searchParams = url.searchParams;

  const error = searchParams.get("error");
  if (error) {
    console.error("Google OAuth callback returned error:", error);
    return NextResponse.redirect(getRedirectUrl(request, `/login?error=${encodeURIComponent(error)}`));
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(getRedirectUrl(request, "/login?error=oauth_missing_code"));
  }

  const storedState = getCookieValue(request, OAUTH_STATE_COOKIE_NAME);
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(getRedirectUrl(request, "/login?error=oauth_state_invalid"));
  }

  try {
    const hostHeader =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      url.host ||
      "localhost:3000";
    const host = hostHeader.split(",")[0].trim();

    const tokens = await exchangeGoogleCode(code, host);
    const profile = await getGoogleUserInfo(tokens.access_token);

    if (!profile.email) {
      return NextResponse.redirect(getRedirectUrl(request, "/login?error=oauth_no_email"));
    }

    const user = await handleGoogleLoginOrSignup(profile);

    const sessionToken = await createSessionToken({
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      emailVerified: true,
      onboardingCompleted: user.onboardingCompleted,
    });

    const targetUrl = user.onboardingCompleted ? "/dashboard" : "/onboarding";
    const response = NextResponse.redirect(getRedirectUrl(request, targetUrl));

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    response.cookies.set(OAUTH_STATE_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    response.cookies.delete(OAUTH_STATE_COOKIE_NAME);

    return response;
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: string }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_")
    ) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    console.error("Google OAuth callback processing error:", message, stack);
    try {
      const fs = await import("node:fs");
      fs.writeFileSync("/tmp/finflow_oauth_error.log", `${new Date().toISOString()} - ${message}\n${stack}\n`);
    } catch {
      // Ignore file write failure
    }
    return NextResponse.redirect(
      getRedirectUrl(request, `/login?error=oauth_failed&msg=${encodeURIComponent(message.slice(0, 150))}`)
    );
  }
}
