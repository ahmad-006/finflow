import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import {
  getGoogleOAuthUrl,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_MAX_AGE_SECONDS,
} from "@/modules/auth/oauth";


export async function GET(request: Request | NextRequest) {
  try {
    const hostHeader =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "localhost:3000";
    const host = hostHeader.split(",")[0].trim();

    const state = crypto.randomBytes(32).toString("hex");
    const authUrl = getGoogleOAuthUrl(host, state);

    const response = NextResponse.redirect(authUrl);

    response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_")
    ) {
      throw error;
    }
    console.error("Failed to initialize Google OAuth consent flow:", error);
    const hostHeader =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "localhost:3000";
    const host = hostHeader.split(",")[0].trim();
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    const protocol =
      request.headers.get("x-forwarded-proto") || (isLocal ? "http" : "https");
    return NextResponse.redirect(`${protocol}://${host}/login?error=oauth_init_failed`);
  }
}
