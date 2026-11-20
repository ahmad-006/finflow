import { describe, it, expect, afterAll } from "bun:test";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import {
  registerUser,
  requestPasswordReset,
  resetPasswordWithOtp,
  loginUser,
} from "@/modules/auth/service";

describe("Domain 9: Production Hardening - Password Reset Security (tests/reset-password.test.ts)", () => {
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

  const timestamp = Date.now() + 200;
  const testEmail = `reset-user-${timestamp}@finflow-audit.test`;
  const initialPassword = "OldSecurePassword2026!#";
  const newPassword = "NewSecurePassword2026!#";
  let companyId = "";
  let userId = "";

  it("should create registered user for password reset testing", async () => {
    const sessionData = await registerUser({
      companyName: `Reset Test Corp ${timestamp}`,
      fullName: "Reset Candidate",
      email: testEmail,
      password: initialPassword,
    });

    companyId = sessionData.company.id;
    userId = sessionData.user.id;
    createdCompanyIds.push(companyId);

    expect(companyId).toBeString();
    expect(userId).toBeString();
  }, 35000);

  // =========================================================================
  // 1. Password Reset Request Flow
  // =========================================================================
  describe("Password Reset Request Flow (requestPasswordReset)", () => {
    it("should create a hashed verification record with type PASSWORD_RESET_OTP", async () => {
      const response = await requestPasswordReset(testEmail);
      expect(response.success).toBe(true);
      expect(response.message).toBeString();

      const record = await db.verificationCode.findFirst({
        where: {
          email: testEmail,
          type: "PASSWORD_RESET_OTP",
          usedAt: null,
        },
        orderBy: { createdAt: "desc" },
      });

      expect(record).not.toBeNull();
      expect(record?.codeHash).toHaveLength(64); // SHA-256 HMAC hash
      expect(record?.attempts).toBe(0);
      expect(record?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    }, 15000);

    it("should return success without leaking existence for non-existent email", async () => {
      const nonExistentEmail = `unknown-${timestamp}@nowhere-test.pk`;
      const response = await requestPasswordReset(nonExistentEmail);

      expect(response.success).toBe(true);
      expect(response.message).toBeString();

      const record = await db.verificationCode.findFirst({
        where: { email: nonExistentEmail },
      });
      expect(record).toBeNull();
    }, 15000);
  });

  // =========================================================================
  // 2. Password Reset Validation & Error Handling
  // =========================================================================
  describe("Password Reset OTP Validation (resetPasswordWithOtp)", () => {
    const plainOtp = "654321";

    it("should configure known reset code for deterministic testing", async () => {
      const record = await db.verificationCode.findFirst({
        where: { email: testEmail, type: "PASSWORD_RESET_OTP" },
        orderBy: { createdAt: "desc" },
      });

      expect(record).not.toBeNull();
      await db.verificationCode.update({
        where: { id: record!.id },
        data: {
          codeHash: hashToken(plainOtp),
          attempts: 0,
          usedAt: null,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
    }, 15000);

    it("should reject invalid reset code and increment attempt counter", async () => {
      await expect(
        resetPasswordWithOtp(testEmail, "999999", newPassword)
      ).rejects.toThrow("Invalid reset code.");

      const record = await db.verificationCode.findFirst({
        where: { email: testEmail, type: "PASSWORD_RESET_OTP" },
        orderBy: { createdAt: "desc" },
      });
      expect(record?.attempts).toBe(1);
    }, 15000);

    it("should lock out when attempts reach maxAttempts (>= 5)", async () => {
      const record = await db.verificationCode.findFirst({
        where: { email: testEmail, type: "PASSWORD_RESET_OTP" },
        orderBy: { createdAt: "desc" },
      });

      await db.verificationCode.update({
        where: { id: record!.id },
        data: { attempts: 5 },
      });

      await expect(
        resetPasswordWithOtp(testEmail, plainOtp, newPassword)
      ).rejects.toThrow("Too many failed attempts. This code is locked. Please request a new one.");
    }, 15000);

    it("should reject expired reset code", async () => {
      const record = await db.verificationCode.findFirst({
        where: { email: testEmail, type: "PASSWORD_RESET_OTP" },
        orderBy: { createdAt: "desc" },
      });

      await db.verificationCode.update({
        where: { id: record!.id },
        data: {
          attempts: 0,
          expiresAt: new Date(Date.now() - 60000), // 1 minute in the past
        },
      });

      await expect(
        resetPasswordWithOtp(testEmail, plainOtp, newPassword)
      ).rejects.toThrow("Reset code has expired. Please request a new one.");
    }, 15000);

    it("should reject reset for non-existent user", async () => {
      await expect(
        resetPasswordWithOtp("nobody@finflow-audit.test", plainOtp, newPassword)
      ).rejects.toThrow();
    }, 15000);
  });

  // =========================================================================
  // 3. Password Reset Success & Subsequent Authentication
  // =========================================================================
  describe("Successful Reset & Authentication Lifecycle", () => {
    const validOtp = "381920";

    it("should successfully reset password with valid OTP", async () => {
      const record = await db.verificationCode.findFirst({
        where: { email: testEmail, type: "PASSWORD_RESET_OTP" },
        orderBy: { createdAt: "desc" },
      });

      await db.verificationCode.update({
        where: { id: record!.id },
        data: {
          codeHash: hashToken(validOtp),
          attempts: 0,
          usedAt: null,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const result = await resetPasswordWithOtp(testEmail, validOtp, newPassword);
      expect(result.success).toBe(true);

      // Verify code is marked used
      const updatedRecord = await db.verificationCode.findUnique({
        where: { id: record!.id },
      });
      expect(updatedRecord?.usedAt).not.toBeNull();

      // Verify audit log
      const audit = await db.auditLog.findFirst({
        where: { companyId, action: "UPDATE", entityType: "USER" },
        orderBy: { timestamp: "desc" },
      });
      expect(audit).not.toBeNull();
    }, 20000);

    it("should authenticate with the new password", async () => {
      const loginResult = await loginUser({
        email: testEmail,
        password: newPassword,
      });

      expect(loginResult.token).toBeString();
      expect(loginResult.user.email).toBe(testEmail);
      expect(loginResult.user.id).toBe(userId);
    }, 15000);

    it("should fail authentication when using the old password", async () => {
      await expect(
        loginUser({
          email: testEmail,
          password: initialPassword,
        })
      ).rejects.toThrow("Invalid email or password.");
    }, 15000);

    it("should reject reusing the already used reset code", async () => {
      await expect(
        resetPasswordWithOtp(testEmail, validOtp, "AnotherNewPassword123!#")
      ).rejects.toThrow("Invalid or expired reset code.");
    }, 15000);
  });
});
