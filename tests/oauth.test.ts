import { describe, it, expect, afterAll } from "bun:test";
import { db } from "@/lib/db";
import {
  handleGoogleLoginOrSignup,
  getGoogleOAuthUrl,
  getOAuthRedirectUri,
} from "@/modules/auth/oauth";
import { createSessionToken, verifySessionToken } from "@/modules/auth/session";
import { registerUser } from "@/modules/auth/service";

describe("Domain 9: Production Hardening - Google OAuth 2.0 Integration (tests/oauth.test.ts)", () => {
  const createdCompanyIds: string[] = [];

  afterAll(async () => {
    for (const companyId of createdCompanyIds) {
      try {
        await db.company.delete({ where: { id: companyId } });
      } catch {
        // Cascading deletion
      }
    }
  });

  // =========================================================================
  // 1. Google OAuth URL Construction & Redirection Contracts
  // =========================================================================
  describe("OAuth URL & Redirect URI Generation", () => {
    it("should construct absolute callback URL according to request host", () => {
      expect(getOAuthRedirectUri("localhost:3000")).toBe("http://localhost:3000/api/auth/callback/google");
      expect(getOAuthRedirectUri("finflow-hq.vercel.app")).toBe("https://finflow-hq.vercel.app/api/auth/callback/google");
      expect(getOAuthRedirectUri("https://custom-domain.pk")).toBe("https://custom-domain.pk/api/auth/callback/google");
    });

    it("should build valid Google OAuth consent URL with state and scopes", () => {
      const state = "secure-random-state-12345";
      const oauthUrl = getGoogleOAuthUrl("localhost:3000", state);

      expect(oauthUrl).toBeString();
      expect(oauthUrl.startsWith("https://accounts.google.com/o/oauth2/v2/auth")).toBe(true);
      expect(oauthUrl).toContain(`state=${state}`);
      expect(oauthUrl).toContain("response_type=code");
      expect(oauthUrl).toContain("scope=openid+email+profile");
    });
  });

  // =========================================================================
  // 2. Google OAuth User Provisioning & Linking Mechanics
  // =========================================================================
  describe("User Provisioning & Account Linking (handleGoogleLoginOrSignup)", () => {
    const timestamp = Date.now() + 300;
    const googleSub = `google-sub-${timestamp}`;
    const googleEmail = `oauth-user-${timestamp}@gmail.test`;
    const googleName = "Tariq Google";
    const googleAvatar = "https://lh3.googleusercontent.com/a/avatar123";

    it("should provision new Company and User with emailVerified === true", async () => {
      const user = await handleGoogleLoginOrSignup({
        sub: googleSub,
        email: googleEmail,
        name: googleName,
        picture: googleAvatar,
      });

      expect(user).not.toBeNull();
      expect(user.email).toBe(googleEmail);
      expect(user.googleId).toBe(googleSub);
      expect(user.authProvider).toBe("GOOGLE");
      expect(user.emailVerified).toBe(true);
      expect(user.passwordHash).toBeNull();
      expect(user.avatarUrl).toBe(googleAvatar);
      expect(user.company).not.toBeNull();
      expect(user.company.name).toBe(`${googleName}'s Company`);

      createdCompanyIds.push(user.companyId);

      // Verify directly from PostgreSQL
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        include: { company: true },
      });
      expect(dbUser?.emailVerified).toBe(true);
      expect(dbUser?.authProvider).toBe("GOOGLE");
      expect(dbUser?.googleId).toBe(googleSub);
    }, 20000);

    it("should return existing user directly on subsequent login with same googleId", async () => {
      const returningUser = await handleGoogleLoginOrSignup({
        sub: googleSub,
        email: googleEmail,
        name: googleName,
      });

      expect(returningUser).not.toBeNull();
      expect(returningUser.email).toBe(googleEmail);
      expect(returningUser.googleId).toBe(googleSub);
    }, 15000);

    it("should link existing local user by email to googleId and verify email", async () => {
      const localEmail = `local-existing-${timestamp}@finflow-audit.test`;
      const localSub = `google-sub-linked-${timestamp}`;

      // 1. Register local unverified user
      const localReg = await registerUser({
        companyName: `Link Corp ${timestamp}`,
        fullName: "Local User Pre-Link",
        email: localEmail,
        password: "LocalPassword2026!#",
      });

      createdCompanyIds.push(localReg.company.id);
      expect(localReg.user.emailVerified).toBe(false);

      // 2. Perform OAuth sign-in with matching email
      const linkedUser = await handleGoogleLoginOrSignup({
        sub: localSub,
        email: localEmail,
        name: "Google Linked Name",
        picture: "https://lh3.googleusercontent.com/a/linked_pic",
      });

      expect(linkedUser.id).toBe(localReg.user.id);
      expect(linkedUser.googleId).toBe(localSub);
      expect(linkedUser.emailVerified).toBe(true);

      // Verify database persistence
      const dbLinked = await db.user.findUnique({
        where: { id: localReg.user.id },
      });
      expect(dbLinked?.googleId).toBe(localSub);
      expect(dbLinked?.emailVerified).toBe(true);
    }, 25000);
  });

  // =========================================================================
  // 3. Session Token Generation for OAuth Users
  // =========================================================================
  describe("OAuth Session Token Generation & Verification", () => {
    it("should generate a valid JWT session for an OAuth authenticated user with emailVerified = true", async () => {
      const testOAuthUser = {
        userId: "usr_oauth_test_9876",
        companyId: "cmp_oauth_test_5432",
        email: "oauth-session@example.test",
        fullName: "Session Test User",
        role: "OWNER",
        emailVerified: true,
      };

      const token = await createSessionToken(testOAuthUser);
      expect(token).toBeString();

      const decoded = await verifySessionToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testOAuthUser.userId);
      expect(decoded?.companyId).toBe(testOAuthUser.companyId);
      expect(decoded?.email).toBe(testOAuthUser.email);
      expect(decoded?.emailVerified).toBe(true);
    });
  });
});
