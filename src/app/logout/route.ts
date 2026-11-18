import { NextResponse, type NextRequest } from "next/server";
import { clearSessionCookie, SESSION_COOKIE_NAME } from "@/modules/auth/session";

export async function GET(request: NextRequest) {
  await clearSessionCookie();
  const response = NextResponse.redirect(new URL("/login", request.url));
  // Expire cookie directly on response as well for maximum reliability
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function POST(request: NextRequest) {
  await clearSessionCookie();
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
