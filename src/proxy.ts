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

function handleProxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // 1. Sanitize incoming request headers to prevent client header injection attacks
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-company-id");
  requestHeaders.delete("x-user-id");
  requestHeaders.delete("x-user-role");

  // 2. Read and verify session cookie
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? verifySessionToken(sessionToken) : null;

  // 3. If authenticated, inject verified tenant identity into downstream request headers
  if (session) {
    requestHeaders.set("x-company-id", session.companyId);
    requestHeaders.set("x-user-id", session.userId);
    requestHeaders.set("x-user-role", session.role);
  }

  // 4. Determine route access
  const isAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/register" ||
    pathname.startsWith("/register/");

  const isPublicRoute =
    isAuthRoute ||
    pathname.startsWith("/pay") ||
    pathname.startsWith("/api/pay") ||
    pathname.startsWith("/api/health");

  const isRootRoute = pathname === "/";

  // If root "/" is requested:
  if (isRootRoute) {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Allow public landing page for unauthenticated visitors
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // If an already authenticated user visits /login or /register, redirect directly to /dashboard
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If an unauthenticated user attempts to access protected dashboard routes
  const isDashboardRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/invoices") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/expenses") ||
    pathname.startsWith("/treasury") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/settings") ||
    (!isPublicRoute && !pathname.startsWith("/api"));

  if (isDashboardRoute && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow request to proceed with sanitized headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export default function proxy(request: NextRequest) {
  return handleProxy(request);
}

export { handleProxy as proxy };
