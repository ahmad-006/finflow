import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "@/lib/db";
import { hashPassword } from "@/modules/auth/password";
import {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
} from "@/modules/auth/session";
import {
  updateCompanySettingsSchema,
  updateUserProfileSchema,
  changePasswordSchema,
} from "@/modules/settings/validation";
import {
  getCompanySettings,
  updateCompanySettings,
  updateUserProfile,
  changePassword,
  getUserProfile,
} from "@/modules/settings/service";
import {
  updateCompanySettingsAction,
  updateUserProfileAction,
  changePasswordAction,
} from "@/modules/settings/actions";

describe("Settings Module: Validation, Service & Server Actions", () => {
  const createdCompanyIds: string[] = [];

  afterAll(async () => {
    for (const companyId of createdCompanyIds) {
      try {
        await db.company.delete({ where: { id: companyId } });
      } catch {
        // Cleanup ignore
      }
    }
  });

  // =========================================================================
  // 1. Zod Validation Schemas
  // =========================================================================
  describe("Zod Validation Schemas", () => {
    it("validates valid company settings and coerces numeric strings", () => {
      const parsed = updateCompanySettingsSchema.parse({
        name: "  Acme Global Industries  ",
        liquidReserve: "150000",
        safetyBuffer: "25000",
      });

      expect(parsed.name).toBe("Acme Global Industries");
      expect(parsed.liquidReserve).toBe(150000);
      expect(parsed.safetyBuffer).toBe(25000);
    });

    it("rejects invalid company settings", () => {
      expect(() =>
        updateCompanySettingsSchema.parse({
          name: "A",
          liquidReserve: 100,
          safetyBuffer: 50,
        })
      ).toThrow();

      expect(() =>
        updateCompanySettingsSchema.parse({
          name: "Acme",
          liquidReserve: -10,
          safetyBuffer: 50,
        })
      ).toThrow();

      expect(() =>
        updateCompanySettingsSchema.parse({
          name: "Acme",
          liquidReserve: 100,
          safetyBuffer: -5,
        })
      ).toThrow();
    });

    it("validates user profile full name", () => {
      const parsed = updateUserProfileSchema.parse({
        fullName: "  Jane Doe  ",
      });
      expect(parsed.fullName).toBe("Jane Doe");

      expect(() =>
        updateUserProfileSchema.parse({
          fullName: "J",
        })
      ).toThrow();
    });

    it("validates change password schema", () => {
      const valid = changePasswordSchema.parse({
        currentPassword: "OldPassword123!",
        newPassword: "NewSecurePassword2026!",
        confirmPassword: "NewSecurePassword2026!",
      });
      expect(valid.currentPassword).toBe("OldPassword123!");
      expect(valid.newPassword).toBe("NewSecurePassword2026!");

      // Mismatched passwords
      expect(() =>
        changePasswordSchema.parse({
          currentPassword: "OldPassword123!",
          newPassword: "NewSecurePassword2026!",
          confirmPassword: "MismatchPassword2026!",
        })
      ).toThrow();

      // Weak new password
      expect(() =>
        changePasswordSchema.parse({
          currentPassword: "OldPassword123!",
          newPassword: "weak",
          confirmPassword: "weak",
        })
      ).toThrow();
    });
  });

  // =========================================================================
  // 2. Settings Service Contracts
  // =========================================================================
  describe("Settings Service Contracts", () => {
    const timestamp = Date.now() + 500;
    let testCompanyId = "";
    let testUserId = "";
    let oauthUserId = "";
    const initialPassword = "InitialPassword2026!#";
    const newPassword = "UpdatedPassword2026!#";

    beforeAll(async () => {
      const initialHash = await hashPassword(initialPassword);

      const company = await db.company.create({
        data: {
          name: `Settings Test Corp ${timestamp}`,
          baseCurrency: "USD",
          liquidReserve: 50000,
          safetyBuffer: 10000,
        },
      });
      testCompanyId = company.id;
      createdCompanyIds.push(company.id);

      const user = await db.user.create({
        data: {
          companyId: company.id,
          email: `settings-${timestamp}@example.com`,
          fullName: "Settings Admin",
          role: "OWNER",
          emailVerified: true,
          authProvider: "LOCAL",
          passwordHash: initialHash,
        },
      });
      testUserId = user.id;

      const oauthUser = await db.user.create({
        data: {
          companyId: company.id,
          email: `oauth-${timestamp}@example.com`,
          fullName: "Google OAuth User",
          role: "MEMBER",
          emailVerified: true,
          authProvider: "GOOGLE",
          passwordHash: null,
          googleId: `google-${timestamp}`,
        },
      });
      oauthUserId = oauthUser.id;

      expect(testCompanyId).toBeString();
      expect(testUserId).toBeString();
      expect(oauthUserId).toBeString();
    }, 30000);

    it("getCompanySettings fetches company details", async () => {
      const settings = await getCompanySettings(testCompanyId);

      expect(settings.id).toBe(testCompanyId);
      expect(settings.name).toBe(`Settings Test Corp ${timestamp}`);
      expect(settings.baseCurrency).toBe("USD");
      expect(settings.liquidReserve).toBe(50000);
      expect(settings.safetyBuffer).toBe(10000);
    });

    it("getCompanySettings throws for invalid company ID", async () => {
      expect(getCompanySettings("00000000-0000-0000-0000-000000000000")).rejects.toThrow();
    });

    it("updateCompanySettings updates company and writes AuditLog", async () => {
      const updated = await updateCompanySettings(testCompanyId, testUserId, {
        name: `Updated Test Corp ${timestamp}`,
        liquidReserve: 75000,
        safetyBuffer: 15000,
      });

      expect(updated.name).toBe(`Updated Test Corp ${timestamp}`);
      expect(updated.liquidReserve).toBe(75000);
      expect(updated.safetyBuffer).toBe(15000);

      // Verify audit log entry
      const auditLog = await db.auditLog.findFirst({
        where: {
          companyId: testCompanyId,
          entityType: "WORKSPACE",
          entityId: testCompanyId,
          action: "UPDATE",
        },
        orderBy: { timestamp: "desc" },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.userId).toBe(testUserId);
      const details = JSON.parse(auditLog?.details || "{}");
      expect(details.updated.name).toBe(`Updated Test Corp ${timestamp}`);
      expect(details.updated.liquidReserve).toBe(75000);
    }, 30000);

    it("updateUserProfile updates full name and writes AuditLog", async () => {
      const updated = await updateUserProfile(testUserId, {
        fullName: "Updated Admin Name",
      });

      expect(updated.id).toBe(testUserId);
      expect(updated.fullName).toBe("Updated Admin Name");

      const auditLog = await db.auditLog.findFirst({
        where: {
          companyId: testCompanyId,
          entityType: "USER",
          entityId: testUserId,
          action: "UPDATE",
        },
        orderBy: { timestamp: "desc" },
      });

      expect(auditLog).not.toBeNull();
      const details = JSON.parse(auditLog?.details || "{}");
      expect(details.updated).toBe("Updated Admin Name");
    }, 30000);

    it("getUserProfile returns full user details", async () => {
      const profile = await getUserProfile(testUserId);
      expect(profile).not.toBeNull();
      expect(profile?.fullName).toBe("Updated Admin Name");
      expect(profile?.email).toBe(`settings-${timestamp}@example.com`);
      expect(profile?.authProvider).toBe("LOCAL");
    }, 30000);

    it("changePassword rejects user without passwordHash (OAuth)", async () => {
      expect(
        changePassword(oauthUserId, "SomeCurrentPassword123!", "SomeNewPassword123!")
      ).rejects.toThrow("Account signs in through Google OAuth. Password change is not supported.");
    }, 30000);

    it("changePassword rejects incorrect current password", async () => {
      expect(
        changePassword(testUserId, "WrongPassword2026!#", newPassword)
      ).rejects.toThrow("Current password is incorrect.");
    }, 30000);

    it("changePassword updates password hash and creates AuditLog on success", async () => {
      const result = await changePassword(testUserId, initialPassword, newPassword);
      expect(result.success).toBe(true);
      expect(result.message).toBe("Password updated successfully.");

      // Check user password updated
      const updatedUser = await db.user.findUnique({
        where: { id: testUserId },
      });
      expect(updatedUser?.passwordHash).not.toBeNull();

      // Check audit log
      const auditLog = await db.auditLog.findFirst({
        where: {
          companyId: testCompanyId,
          entityType: "USER",
          entityId: testUserId,
          action: "UPDATE",
        },
        orderBy: { timestamp: "desc" },
      });
      expect(auditLog).not.toBeNull();
      const details = JSON.parse(auditLog?.details || "{}");
      expect(details.event).toBe("PASSWORD_CHANGED");
    }, 30000);
  });

  // =========================================================================
  // 3. Server Actions Authentication & Tenancy Contracts
  // =========================================================================
  describe("Server Actions Security & Tenancy Contracts", () => {
    it("rejects unauthenticated updateCompanySettingsAction calls", async () => {
      await clearSessionCookie();
      const result = await updateCompanySettingsAction({
        name: "Unauthorized Corp",
        liquidReserve: 1000,
        safetyBuffer: 500,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("You must be signed in to perform this action.");
    });

    it("rejects unauthenticated updateUserProfileAction calls", async () => {
      await clearSessionCookie();
      const result = await updateUserProfileAction({
        fullName: "Unauthorized Name",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("You must be signed in to perform this action.");
    });

    it("rejects unauthenticated changePasswordAction calls", async () => {
      await clearSessionCookie();
      const result = await changePasswordAction({
        currentPassword: "old",
        newPassword: "new",
        confirmPassword: "new",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("You must be signed in to perform this action.");
    });

    it("executes updateCompanySettingsAction successfully with authenticated session", async () => {
      const companyId = createdCompanyIds[0];
      const user = await db.user.findFirst({ where: { companyId } });
      expect(user).not.toBeNull();

      const session = {
        userId: user!.id,
        companyId: companyId,
        email: user!.email,
        fullName: user!.fullName,
        role: user!.role,
        emailVerified: true,
        onboardingCompleted: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
      };

      const result = await updateCompanySettingsAction(
        null,
        {
          name: "Action Verified Corp",
          liquidReserve: "88000",
          safetyBuffer: "12000",
        },
        session
      );

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Action Verified Corp");
      expect(result.data?.liquidReserve).toBe(88000);
    }, 30000);

    it("executes updateUserProfileAction successfully with authenticated session", async () => {
      const companyId = createdCompanyIds[0];
      const user = await db.user.findFirst({ where: { companyId } });
      expect(user).not.toBeNull();

      const session = {
        userId: user!.id,
        companyId: companyId,
        email: user!.email,
        fullName: user!.fullName,
        role: user!.role,
        emailVerified: true,
        onboardingCompleted: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
      };

      const result = await updateUserProfileAction(
        null,
        {
          fullName: "Action Updated Name",
        },
        session
      );

      expect(result.success).toBe(true);
      expect(result.data?.fullName).toBe("Action Updated Name");
    }, 30000);
  });
});
