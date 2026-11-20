import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/modules/auth/session";

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public assets (*.svg, *.png, *.jpg, *.jpeg, *.gif, *.webp, *.ico)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

async function handleProxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 1. Sanitize incoming request headers to prevent client header injection attacks
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-company-id");
  requestHeaders.delete("x-user-id");
  requestHeaders.delete("x-user-role");
  requestHeaders.delete("x-email-verified");

  // 2. Read and verify session cookie
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? await verifySessionToken(sessionToken) : null;

  // 3. If authenticated, inject verified tenant identity into downstream request headers
  if (session) {
    requestHeaders.set("x-company-id", session.companyId);
    requestHeaders.set("x-user-id", session.userId);
    requestHeaders.set("x-user-role", session.role);
    requestHeaders.set("x-email-verified", String(session.emailVerified));
  }

  // 4. Route classification
  const isLogoutRoute = pathname === "/logout" || pathname.startsWith("/logout/");
  const isApiAuthRoute = pathname.startsWith("/api/auth");
  const isVerifyEmailRoute = pathname === "/verify-email" || pathname.startsWith("/verify-email/");

  const isPublicAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/register" ||
    pathname.startsWith("/register/") ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/forgot-password/") ||
    pathname === "/reset-password" ||
    pathname.startsWith("/reset-password/");

  const isPublicUtilityRoute =
    pathname.startsWith("/pay") ||
    pathname.startsWith("/api/pay") ||
    pathname.startsWith("/api/health");

  const isRootRoute = pathname === "/";

  const isCockpitRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/invoices") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/cash-flow") ||
    pathname.startsWith("/expenses") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/treasury") ||
    pathname.startsWith("/settings");

  // Allow explicit session logout regardless of verification status
  if (isLogoutRoute) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Case A: Authenticated user with UNVERIFIED email (emailVerified = false)
  if (session && !session.emailVerified) {
    // Only allow /verify-email, /api/auth/*, and static assets
    if (isVerifyEmailRoute || isApiAuthRoute) {
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    // Redirect all cockpit routes and any other routes to /verify-email
    return NextResponse.redirect(new URL("/verify-email", request.url));
  }

  // Case B: Authenticated user with VERIFIED email (emailVerified = true)
  if (session && session.emailVerified) {
    // If authenticated & verified user visits login, register, or verify-email, redirect to /dashboard
    if (isPublicAuthRoute || isVerifyEmailRoute || isRootRoute) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Case C: Unauthenticated visitor (no active session)
  // Allow landing page
  if (isRootRoute) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Allow unauthenticated access to login, register, forgot-password, reset-password, pay, verify-email, api/auth
  if (isPublicAuthRoute || isPublicUtilityRoute || isVerifyEmailRoute || isApiAuthRoute) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Intercept all protected cockpit routes and redirect to /login
  if (isCockpitRoute || !pathname.startsWith("/api")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow remaining non-protected routes (e.g. public APIs)
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export default async function proxy(request: NextRequest): Promise<NextResponse> {
  return await handleProxy(request);
}

export { handleProxy as proxy };
