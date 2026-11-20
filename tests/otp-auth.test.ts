import { describe, it, expect, afterAll } from "bun:test";
import { db } from "@/lib/db";
import {
  hashToken,
  verifyTokenHash,
  generateNumericOtp,
  generateSecureToken,
} from "@/lib/tokens";
import {
  registerUser,
  verifySignupOtp,
  resendSignupOtp,
} from "@/modules/auth/service";

describe("Domain 9: Production Hardening - OTP Authentication Security", () => {
  const createdCompanyIds: string[] = [];

  afterAll(async () => {
    for (const companyId of createdCompanyIds) {
      try {
        await db.company.delete({ where: { id: companyId } });
      } catch {
        // Cleaned up or cascading
      }
    }
  });

  // =========================================================================
  // 1. Cryptographic Hashing Utilities in src/lib/tokens.ts
  // =========================================================================
  describe("Cryptographic Token & OTP Security (src/lib/tokens.ts)", () => {
    it("should generate a 6-digit numeric OTP with proper format", () => {
      for (let i = 0; i < 20; i++) {
        const otp = generateNumericOtp();
        expect(otp).toBeString();
        expect(otp).toHaveLength(6);
        expect(/^\d{6}$/.test(otp)).toBe(true);
        const num = Number(otp);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThanOrEqual(999999);
      }
    });

    it("should compute SHA-256 HMAC hash of plaintext token", () => {
      const otp = "582914";
      const hash1 = hashToken(otp);
      const hash2 = hashToken(otp);

      expect(hash1).toBeString();
      expect(hash1).toHaveLength(64); // 256 bits = 64 hex characters
      expect(hash1).toBe(hash2);
    });

    it("should produce distinct hashes for different tokens", () => {
      const hash1 = hashToken("123456");
      const hash2 = hashToken("123457");

      expect(hash1).not.toBe(hash2);
    });

    it("should verify matching candidate code with verifyTokenHash", () => {
      const otp = "918273";
      const hash = hashToken(otp);

      expect(verifyTokenHash(otp, hash)).toBe(true);
      expect(verifyTokenHash(` ${otp} `, hash)).toBe(true); // trims whitespace
    });

    it("should reject non-matching candidate code with verifyTokenHash", () => {
      const otp = "918273";
      const hash = hashToken(otp);

      expect(verifyTokenHash("000000", hash)).toBe(false);
      expect(verifyTokenHash("918274", hash)).toBe(false);
      expect(verifyTokenHash("", hash)).toBe(false);
    });

    it("should gracefully handle malformed hash inputs in verifyTokenHash", () => {
      expect(verifyTokenHash("123456", "invalid-hex-non-sha256")).toBe(false);
      expect(verifyTokenHash("123456", "")).toBe(false);
    });

    it("should generate cryptographically random url-safe tokens", () => {
      const token1 = generateSecureToken(32);
      const token2 = generateSecureToken(32);

      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });
  });

  // =========================================================================
  // 2. Registration & Cryptographic Storage of Verification Codes
  // =========================================================================
  describe("Registration Creates Unverified User & Hashed Verification Records", () => {
    const timestamp = Date.now();
    const testEmail = `otp-user-${timestamp}@finflow-audit.test`;
    let registeredCompanyId = "";
    let registeredUserId = "";

    it("should register new user with emailVerified = false", async () => {
      const sessionData = await registerUser({
        companyName: `OTP Audit Corp ${timestamp}`,
        fullName: "Zayd Audit",
        email: testEmail,
        password: "SecurePassword2026!#",
        baseCurrency: "PKR",
      });

      expect(sessionData.user.emailVerified).toBe(false);
      expect(sessionData.user.email).toBe(testEmail);
      registeredCompanyId = sessionData.company.id;
      registeredUserId = sessionData.user.id;
      createdCompanyIds.push(registeredCompanyId);

      // Verify database state
      const dbUser = await db.user.findUnique({
        where: { id: registeredUserId },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.emailVerified).toBe(false);
      expect(dbUser?.authProvider).toBe("LOCAL");
    }, 20000);

    it("should store ONLY SHA-256 HMAC hash in verification_codes table, never plaintext", async () => {
      const records = await db.verificationCode.findMany({
        where: {
          email: testEmail,
          type: "SIGNUP_OTP",
        },
      });

      expect(records.length).toBeGreaterThanOrEqual(1);
      const latest = records[records.length - 1];

      // Must be 64-character SHA-256 HMAC hex string
      expect(latest.codeHash).toBeString();
      expect(latest.codeHash).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/i.test(latest.codeHash)).toBe(true);

      // Plaintext OTP (6 digits) must never equal codeHash
      expect(latest.codeHash).not.toHaveLength(6);
      expect(latest.usedAt).toBeNull();
      expect(latest.attempts).toBe(0);
      expect(latest.maxAttempts).toBe(5);
    });
  });

  // =========================================================================
  // 3. Verification Code Lifecycle & Lockout Mechanics
  // =========================================================================
  describe("OTP Verification Lifecycle, Attempt Throttling & Expiry", () => {
    const timestamp = Date.now() + 100;
    const testEmail = `otp-flow-${timestamp}@finflow-audit.test`;
    const plainOtp = "741852";
    let companyId = "";

    it("should setup test user and hashed verification record", async () => {
      const sessionData = await registerUser({
        companyName: `Lifecycle Corp ${timestamp}`,
        fullName: "Lifecycle Tester",
        email: testEmail,
        password: "LifecyclePassword2026!#",
      });

      companyId = sessionData.company.id;
      createdCompanyIds.push(companyId);

      // Inject known OTP hash into the latest record for deterministic validation
      const hashedKnown = hashToken(plainOtp);
      const latestRecord = await db.verificationCode.findFirst({
        where: { email: testEmail, type: "SIGNUP_OTP" },
        orderBy: { createdAt: "desc" },
      });

      expect(latestRecord).not.toBeNull();
      await db.verificationCode.update({
        where: { id: latestRecord!.id },
        data: { codeHash: hashedKnown },
      });
    }, 20000);

    it("should increment attempts on invalid OTP and reject", async () => {
      await expect(
        verifySignupOtp(testEmail, "000000")
      ).rejects.toThrow("Invalid verification code.");

      const record = await db.verificationCode.findFirst({
        where: { email: testEmail, type: "SIGNUP_OTP" },
        orderBy: { createdAt: "desc" },
      });

      expect(record?.attempts).toBe(1);
    }, 15000);

    it("should lock out when attempts reach maxAttempts (>= 5)", async () => {
      const record = await db.verificationCode.findFirst({
        where: { email: testEmail, type: "SIGNUP_OTP" },
        orderBy: { createdAt: "desc" },
      });

      // Advance attempts to 5
      await db.verificationCode.update({
        where: { id: record!.id },
        data: { attempts: 5 },
      });

      await expect(
        verifySignupOtp(testEmail, plainOtp)
      ).rejects.toThrow("Too many failed attempts. This code is locked. Please request a new code.");
    }, 15000);

    it("should reject expired verification code", async () => {
      // Reset attempts and set expiresAt in the past
      const record = await db.verificationCode.findFirst({
        where: { email: testEmail, type: "SIGNUP_OTP" },
        orderBy: { createdAt: "desc" },
      });

      await db.verificationCode.update({
        where: { id: record!.id },
        data: {
          attempts: 0,
          expiresAt: new Date(Date.now() - 1000 * 60), // 1 minute ago
        },
      });

      await expect(
        verifySignupOtp(testEmail, plainOtp)
      ).rejects.toThrow("Verification code has expired. Please request a new code.");
    }, 15000);

    it("should successfully verify with valid OTP, mark usedAt, and update emailVerified to true", async () => {
      // Refresh record with valid expiry and 0 attempts
      const record = await db.verificationCode.findFirst({
        where: { email: testEmail, type: "SIGNUP_OTP" },
        orderBy: { createdAt: "desc" },
      });

      await db.verificationCode.update({
        where: { id: record!.id },
        data: {
          attempts: 0,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          usedAt: null,
        },
      });

      const updatedUser = await verifySignupOtp(testEmail, plainOtp);
      expect(updatedUser.emailVerified).toBe(true);

      // Verify database state
      const dbUser = await db.user.findUnique({
        where: { email: testEmail },
      });
      expect(dbUser?.emailVerified).toBe(true);

      const dbRecord = await db.verificationCode.findUnique({
        where: { id: record!.id },
      });
      expect(dbRecord?.usedAt).not.toBeNull();
    }, 20000);

    it("should reject already used verification code on subsequent verification attempts", async () => {
      await expect(
        verifySignupOtp(testEmail, plainOtp)
      ).rejects.toThrow("No verification code found. Please request a new code.");
    }, 15000);
  });
});
