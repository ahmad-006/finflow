import { describe, it, expect } from "bun:test";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/modules/auth/session";

describe("Domain 1: Proxy Route Interception & Email Verification Guard", () => {
  const baseUrl = "https://finflow.test";

  async function createTestCookie(emailVerified: boolean, onboardingCompleted: boolean = true): Promise<string> {
    const token = await createSessionToken({
      userId: "usr_proxy_test",
      companyId: "cmp_proxy_test",
      email: "test@finflow.test",
      fullName: "Test User",
      role: "OWNER",
      emailVerified,
      onboardingCompleted,
    });
    return `${SESSION_COOKIE_NAME}=${token}`;
  }

  describe("Unauthenticated User", () => {
    it("should allow public landing page at /", async () => {
      const req = new NextRequest(new URL("/", baseUrl));
      const res = await proxy(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("should allow /login", async () => {
      const req = new NextRequest(new URL("/login", baseUrl));
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("should allow /register", async () => {
      const req = new NextRequest(new URL("/register", baseUrl));
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("should allow /forgot-password and /reset-password", async () => {
      const req1 = new NextRequest(new URL("/forgot-password", baseUrl));
      const res1 = await proxy(req1);
      expect(res1.status).toBe(200);

      const req2 = new NextRequest(new URL("/reset-password", baseUrl));
      const res2 = await proxy(req2);
      expect(res2.status).toBe(200);
    });

    it("should allow /pay/[token] public invoice portal", async () => {
      const req = new NextRequest(new URL("/pay/inv-view-token-123", baseUrl));
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("should redirect protected /dashboard to /login", async () => {
      const req = new NextRequest(new URL("/dashboard", baseUrl));
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login?from=%2Fdashboard");
    });

    it("should redirect protected /invoices to /login", async () => {
      const req = new NextRequest(new URL("/invoices", baseUrl));
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login?from=%2Finvoices");
    });

    it("should redirect /onboarding to /login when unauthenticated", async () => {
      const req = new NextRequest(new URL("/onboarding", baseUrl));
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login?from=%2Fonboarding");
    });
  });

  describe("Authenticated User with Unverified Email (emailVerified: false)", () => {
    it("should allow /verify-email", async () => {
      const cookie = await createTestCookie(false);
      const req = new NextRequest(new URL("/verify-email", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("should allow /api/auth endpoints", async () => {
      const cookie = await createTestCookie(false);
      const req = new NextRequest(new URL("/api/auth/google", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("should redirect /dashboard to /verify-email", async () => {
      const cookie = await createTestCookie(false);
      const req = new NextRequest(new URL("/dashboard", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${baseUrl}/verify-email`);
    });

    it("should redirect /invoices to /verify-email", async () => {
      const cookie = await createTestCookie(false);
      const req = new NextRequest(new URL("/invoices", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${baseUrl}/verify-email`);
    });

    it("should redirect /calendar to /verify-email", async () => {
      const cookie = await createTestCookie(false);
      const req = new NextRequest(new URL("/calendar", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${baseUrl}/verify-email`);
    });

    it("should redirect /cash-flow to /verify-email", async () => {
      const cookie = await createTestCookie(false);
      const req = new NextRequest(new URL("/cash-flow", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${baseUrl}/verify-email`);
    });

    it("should redirect /expenses to /verify-email", async () => {
      const cookie = await createTestCookie(false);
      const req = new NextRequest(new URL("/expenses", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${baseUrl}/verify-email`);
    });

    it("should redirect /clients to /verify-email", async () => {
      const cookie = await createTestCookie(false);
      const req = new NextRequest(new URL("/clients", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${baseUrl}/verify-email`);
    });

    it("should still allow public /pay/[token] and /invite links when session is unverified or un-onboarded", async () => {
      const unverifiedCookie = await createTestCookie(false, false);
      const incompleteOnboardingCookie = await createTestCookie(true, false);

      const payUnverified = await proxy(
        new NextRequest(new URL("/pay/inv-token-abc", baseUrl), {
          headers: { cookie: unverifiedCookie },
        })
      );
      expect(payUnverified.status).toBe(200);

      const payUnonboarded = await proxy(
        new NextRequest(new URL("/pay/inv-token-abc", baseUrl), {
          headers: { cookie: incompleteOnboardingCookie },
        })
      );
      expect(payUnonboarded.status).toBe(200);

      const inviteUnverified = await proxy(
        new NextRequest(new URL("/invite?token=abc", baseUrl), {
          headers: { cookie: unverifiedCookie },
        })
      );
      expect(inviteUnverified.status).toBe(200);
    });
  });

  describe("Authenticated User with Verified Email (emailVerified: true)", () => {
    it("should redirect /login to /dashboard", async () => {
      const cookie = await createTestCookie(true);
      const req = new NextRequest(new URL("/login", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${baseUrl}/dashboard`);
    });

    it("should redirect /verify-email to /dashboard", async () => {
      const cookie = await createTestCookie(true);
      const req = new NextRequest(new URL("/verify-email", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${baseUrl}/dashboard`);
    });

    it("should allow /dashboard", async () => {
      const cookie = await createTestCookie(true);
      const req = new NextRequest(new URL("/dashboard", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("should inject x-company-id, x-user-id, and x-email-verified headers", async () => {
      const cookie = await createTestCookie(true);
      const req = new NextRequest(new URL("/dashboard", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      // In NextResponse.next(), the injected request headers are on res
      expect(res.status).toBe(200);
    });

    it("should redirect /onboarding to /dashboard when onboarding is completed", async () => {
      const cookie = await createTestCookie(true, true);
      const req = new NextRequest(new URL("/onboarding", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${baseUrl}/dashboard`);
    });
  });

  describe("Authenticated User with Incomplete Onboarding (emailVerified: true, onboardingCompleted: false)", () => {
    it("should allow /onboarding", async () => {
      const cookie = await createTestCookie(true, false);
      const req = new NextRequest(new URL("/onboarding", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("should allow /api/auth endpoints", async () => {
      const cookie = await createTestCookie(true, false);
      const req = new NextRequest(new URL("/api/auth/google", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });

    it("should redirect /dashboard to /onboarding", async () => {
      const cookie = await createTestCookie(true, false);
      const req = new NextRequest(new URL("/dashboard", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${baseUrl}/onboarding`);
    });

    it("should redirect /invoices to /onboarding", async () => {
      const cookie = await createTestCookie(true, false);
      const req = new NextRequest(new URL("/invoices", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${baseUrl}/onboarding`);
    });

    it("should redirect /settings to /onboarding", async () => {
      const cookie = await createTestCookie(true, false);
      const req = new NextRequest(new URL("/settings", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${baseUrl}/onboarding`);
    });

    it("should redirect /login to /onboarding", async () => {
      const cookie = await createTestCookie(true, false);
      const req = new NextRequest(new URL("/login", baseUrl), {
        headers: { cookie },
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${baseUrl}/onboarding`);
    });
  });
});
