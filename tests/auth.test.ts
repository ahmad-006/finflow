import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import Decimal from "decimal.js";
import { hashPassword, verifyPassword } from "@/modules/auth/password";
import { signSession, verifySessionToken, SESSION_MAX_AGE_SECONDS } from "@/modules/auth/session";
import {
  registerSchema,
  loginSchema,
  checkPasswordStrength,
} from "@/modules/auth/validation";
import {
  registerUserAndCompany,
  loginUser,
  getUserWithCompany,
  getCompanyById,
} from "@/modules/auth/service";
import { db } from "@/lib/db";
import type { SessionPayload } from "@/modules/auth/types";

describe("Domain 1: Multi-Tenant Identity & Auth Service", () => {
  const createdCompanyIds: string[] = [];

  afterAll(async () => {
    // Clean up all live test records created in Neon PostgreSQL
    for (const companyId of createdCompanyIds) {
      try {
        await db.company.delete({ where: { id: companyId } });
      } catch {
        // Ignore if already deleted
      }
    }
  });

  // =========================================================================
  // 1. Password Hashing (Native scrypt + Salt)
  // =========================================================================
  describe("Password Hashing & Verification", () => {
    it("should hash a password with random salt in salt:key format", async () => {
      const plainPassword = "SecretPassword123!#";
      const hash = await hashPassword(plainPassword);

      expect(hash).toBeString();
      const parts = hash.split(":");
      expect(parts.length).toBe(2);
      expect(parts[0].length).toBe(32); // 16 bytes hex = 32 chars
      expect(parts[1].length).toBe(128); // 64 bytes hex = 128 chars
    });

    it("should generate distinct hashes for the same password due to random salt", async () => {
      const password = "SharedPassword2026$";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
      expect(hash1.split(":")[0]).not.toBe(hash2.split(":")[0]);
    });

    it("should verify valid password against scrypt hash", async () => {
      const password = "ValidPassword123#$";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject invalid password against scrypt hash", async () => {
      const password = "ValidPassword123#$";
      const hash = await hashPassword(password);

      const isInvalid = await verifyPassword("WrongPassword456!@", hash);
      expect(isInvalid).toBe(false);
    });

    it("should gracefully handle malformed hash strings or empty inputs", async () => {
      expect(await verifyPassword("", "salt:key")).toBe(false);
      expect(await verifyPassword("password", "")).toBe(false);
      expect(await verifyPassword("password", "invalid-format-without-colon")).toBe(false);
      expect(await verifyPassword("password", "nothex:nothex")).toBe(false);
    });

    it("should throw an error when attempting to hash an empty password", async () => {
      expect(async () => {
        await hashPassword("");
      }).toThrow();
    });
  });

  // =========================================================================
  // 2. Session Management & HMAC Verification
  // =========================================================================
  describe("Session Management & HMAC Cryptographic Signing", () => {
    const mockPayload: SessionPayload = {
      userId: "usr_test_123456",
      companyId: "cmp_test_abcdef",
      email: "finance@rehmansons.pk",
      fullName: "Tariq Rehman",
      role: "OWNER",
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    };

    it("should sign a session payload into a structured base64url token", () => {
      const token = signSession(mockPayload);
      expect(token).toBeString();
      const parts = token.split(".");
      expect(parts.length).toBe(2);
      expect(parts[0]).toBeString();
      expect(parts[1]).toBeString();
    });

    it("should verify and decode a signed session token accurately", () => {
      const token = signSession(mockPayload);
      const verified = verifySessionToken(token);

      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(mockPayload.userId);
      expect(verified?.companyId).toBe(mockPayload.companyId);
      expect(verified?.email).toBe(mockPayload.email);
      expect(verified?.fullName).toBe(mockPayload.fullName);
      expect(verified?.role).toBe("OWNER");
    });

    it("should reject a token when the payload has been tampered with", () => {
      const token = signSession(mockPayload);
      const [data, signature] = token.split(".");

      // Tamper payload to elevate role to SUPERADMIN or change companyId
      const decoded = JSON.parse(Buffer.from(data, "base64url").toString());
      decoded.companyId = "cmp_attacker_target";
      const tamperedData = Buffer.from(JSON.stringify(decoded)).toString("base64url");
      const tamperedToken = `${tamperedData}.${signature}`;

      const verified = verifySessionToken(tamperedToken);
      expect(verified).toBeNull();
    });

    it("should reject a token when the HMAC signature has been tampered with", () => {
      const token = signSession(mockPayload);
      const [data, signature] = token.split(".");
      const alteredSignature = signature.slice(0, -4) + "XXXX";
      const tamperedToken = `${data}.${alteredSignature}`;

      const verified = verifySessionToken(tamperedToken);
      expect(verified).toBeNull();
    });

    it("should reject expired sessions", () => {
      const expiredPayload: SessionPayload = {
        ...mockPayload,
        expiresAt: Date.now() - 5000, // Expired 5 seconds ago
      };

      const token = signSession(expiredPayload);
      const verified = verifySessionToken(token);
      expect(verified).toBeNull();
    });

    it("should reject malformed token strings", () => {
      expect(verifySessionToken("")).toBeNull();
      expect(verifySessionToken("justastring")).toBeNull();
      expect(verifySessionToken("one.two.three")).toBeNull();
      expect(verifySessionToken("invalid_data.invalid_sig")).toBeNull();
    });
  });

  // =========================================================================
  // 3. Input Validation & Zod Schemas
  // =========================================================================
  describe("Registration & Login Input Validation", () => {
    it("should validate live password checklist rules via checkPasswordStrength", () => {
      // Missing length (< 8)
      const report1 = checkPasswordStrength("Ab1!");
      expect(report1.length).toBe(false);
      expect(report1.isValid).toBe(false);

      // Missing capital
      const report2 = checkPasswordStrength("lowercase123!@");
      expect(report2.hasUpper).toBe(false);
      expect(report2.isValid).toBe(false);

      // Missing number
      const report3 = checkPasswordStrength("LettersOnly!@#$");
      expect(report3.number).toBe(false);
      expect(report3.isValid).toBe(false);

      // Missing special character
      const report4 = checkPasswordStrength("LettersAndNum123");
      expect(report4.special).toBe(false);
      expect(report4.isValid).toBe(false);

      // Meets all criteria
      const report5 = checkPasswordStrength("StrongFinFlow2026!");
      expect(report5.length).toBe(true);
      expect(report5.hasUpper).toBe(true);
      expect(report5.hasLower).toBe(true);
      expect(report5.number).toBe(true);
      expect(report5.special).toBe(true);
      expect(report5.isValid).toBe(true);
    });

    it("should validate and normalize registration schema inputs", () => {
      const rawInput = {
        companyName: "   Rehman & Sons Trading Ltd.   ",
        fullName: "   Tariq Rehman   ",
        email: "   TARIQ.REHMAN@DOMAIN.COM   ",
        password: "SecurePassword2026!#",
        baseCurrency: "pkr",
        liquidReserve: "1500000.50",
        safetyBuffer: 250000,
      };

      const parsed = registerSchema.parse(rawInput);
      expect(parsed.companyName).toBe("Rehman & Sons Trading Ltd.");
      expect(parsed.fullName).toBe("Tariq Rehman");
      expect(parsed.email).toBe("tariq.rehman@domain.com");
      expect(parsed.baseCurrency).toBe("PKR");
      expect(parsed.liquidReserve).toBe(1500000.5);
      expect(parsed.safetyBuffer).toBe(250000);
    });

    it("should reject invalid registration inputs", () => {
      // Invalid email
      expect(() => {
        registerSchema.parse({
          companyName: "FinFlow Test",
          fullName: "Test User",
          email: "not-an-email",
          password: "ValidPass123!#",
        });
      }).toThrow();

      // Negative liquid reserve
      expect(() => {
        registerSchema.parse({
          companyName: "FinFlow Test",
          fullName: "Test User",
          email: "test@domain.com",
          password: "ValidPass123!#",
          liquidReserve: -500,
        });
      }).toThrow();

      // Password too weak
      expect(() => {
        registerSchema.parse({
          companyName: "FinFlow Test",
          fullName: "Test User",
          email: "test@domain.com",
          password: "weak",
        });
      }).toThrow();
    });

    it("should validate login input schema", () => {
      const parsed = loginSchema.parse({
        email: "  USER@FINFLOW.IO ",
        password: "mypassword123",
      });
      expect(parsed.email).toBe("user@finflow.io");
      expect(parsed.password).toBe("mypassword123");

      expect(() => {
        loginSchema.parse({
          email: "invalid-email",
          password: "pwd",
        });
      }).toThrow();
    });
  });

  // =========================================================================
  // 4. Live Database Verification on Neon PostgreSQL
  // =========================================================================
  describe("Live Neon PostgreSQL Database & Atomic Transactions", () => {
    const timestamp = Date.now();
    const testEmail = `owner-${timestamp}@finflow-verification.test`;
    const testPassword = `Password${timestamp}!#`;
    let registeredCompanyId = "";
    let registeredUserId = "";

    it("should atomically create Company, User (OWNER), and AuditLog in Neon DB", async () => {
      const sessionData = await registerUserAndCompany({
        companyName: `Verification Corp ${timestamp}`,
        fullName: "Verification Tester",
        email: testEmail,
        password: testPassword,
        baseCurrency: "PKR",
        liquidReserve: 2500000.75,
        safetyBuffer: 500000.0,
      });

      expect(sessionData.token).toBeString();
      expect(sessionData.user.email).toBe(testEmail);
      expect(sessionData.user.role).toBe("OWNER");
      expect(sessionData.company.name).toBe(`Verification Corp ${timestamp}`);

      registeredCompanyId = sessionData.company.id;
      registeredUserId = sessionData.user.id;
      createdCompanyIds.push(registeredCompanyId);

      // Verify directly from PostgreSQL
      const dbCompany = await db.company.findUnique({
        where: { id: registeredCompanyId },
      });
      expect(dbCompany).not.toBeNull();
      expect(dbCompany?.name).toBe(`Verification Corp ${timestamp}`);
      expect(dbCompany?.baseCurrency).toBe("PKR");
      expect(new Decimal(dbCompany?.liquidReserve ?? 0).toFixed(2)).toBe("2500000.75");
      expect(new Decimal(dbCompany?.safetyBuffer ?? 0).toFixed(2)).toBe("500000.00");

      const dbUser = await db.user.findUnique({
        where: { id: registeredUserId },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.email).toBe(testEmail);
      expect(dbUser?.companyId).toBe(registeredCompanyId);
      expect(dbUser?.role).toBe("OWNER");

      // Verify audit log creation
      const auditLog = await db.auditLog.findFirst({
        where: { companyId: registeredCompanyId, action: "CREATE" },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.entityType).toBe("WORKSPACE");
    }, 20000);

    it("should authenticate the newly created user and verify credentials in loginUser", async () => {
      const loginResult = await loginUser({
        email: testEmail,
        password: testPassword,
      });

      expect(loginResult.token).toBeString();
      expect(loginResult.user.id).toBe(registeredUserId);
      expect(loginResult.company.id).toBe(registeredCompanyId);

      const verified = verifySessionToken(loginResult.token);
      expect(verified?.userId).toBe(registeredUserId);
      expect(verified?.companyId).toBe(registeredCompanyId);
    });

    it("should reject login with wrong password", async () => {
      expect(async () => {
        await loginUser({
          email: testEmail,
          password: "IncorrectPassword123!#",
        });
      }).toThrow("Invalid email or password.");
    });

    it("should reject login for non-existent user", async () => {
      expect(async () => {
        await loginUser({
          email: "doesnotexist@finflow-verification.test",
          password: testPassword,
        });
      }).toThrow("Invalid email or password.");
    });

    it("should reject duplicate registration with identical email", async () => {
      expect(async () => {
        await registerUserAndCompany({
          companyName: "Duplicate Corp",
          fullName: "Duplicate User",
          email: testEmail, // same email
          password: testPassword,
        });
      }).toThrow("A user with this email address already exists.");
    });

    it("should fetch user with company details via getUserWithCompany", async () => {
      const userWithCompany = await getUserWithCompany(registeredUserId);
      expect(userWithCompany).not.toBeNull();
      expect(userWithCompany?.email).toBe(testEmail);
      expect(userWithCompany?.company.id).toBe(registeredCompanyId);
      expect(userWithCompany?.company.name).toBe(`Verification Corp ${timestamp}`);
    });
  });

  // =========================================================================
  // 5. Multi-Tenant Data Isolation
  // =========================================================================
  describe("Prisma Multi-Tenant Isolation", () => {
    const time = Date.now();
    let tenantACompanyId = "";
    let tenantBCompanyId = "";
    let tenantAUserId = "";
    let tenantBUserId = "";

    beforeAll(async () => {
      // Register Tenant A
      const tenantA = await registerUserAndCompany({
        companyName: `Tenant Alpha ${time}`,
        fullName: "Alpha Owner",
        email: `alpha-${time}@finflow-tenant.test`,
        password: `AlphaPass${time}!#`,
        baseCurrency: "PKR",
        liquidReserve: 1000000,
        safetyBuffer: 200000,
      });
      tenantACompanyId = tenantA.company.id;
      tenantAUserId = tenantA.user.id;
      createdCompanyIds.push(tenantACompanyId);

      // Register Tenant B
      const tenantB = await registerUserAndCompany({
        companyName: `Tenant Beta ${time}`,
        fullName: "Beta Owner",
        email: `beta-${time}@finflow-tenant.test`,
        password: `BetaPass${time}!#`,
        baseCurrency: "USD",
        liquidReserve: 50000,
        safetyBuffer: 10000,
      });
      tenantBCompanyId = tenantB.company.id;
      tenantBUserId = tenantB.user.id;
      createdCompanyIds.push(tenantBCompanyId);
    }, 30000);

    it("should enforce companyId isolation between users", async () => {
      // Query users for Tenant A
      const tenantAUsers = await db.user.findMany({
        where: { companyId: tenantACompanyId },
      });
      expect(tenantAUsers.length).toBe(1);
      expect(tenantAUsers[0].id).toBe(tenantAUserId);
      expect(tenantAUsers[0].companyId).toBe(tenantACompanyId);

      // Query users for Tenant B
      const tenantBUsers = await db.user.findMany({
        where: { companyId: tenantBCompanyId },
      });
      expect(tenantBUsers.length).toBe(1);
      expect(tenantBUsers[0].id).toBe(tenantBUserId);
      expect(tenantBUsers[0].companyId).toBe(tenantBCompanyId);

      // Cross-tenant query should yield empty
      const leakedUser = await db.user.findFirst({
        where: { id: tenantAUserId, companyId: tenantBCompanyId },
      });
      expect(leakedUser).toBeNull();
    });

    it("should enforce companyId isolation on audit logs", async () => {
      const alphaLogs = await db.auditLog.findMany({
        where: { companyId: tenantACompanyId },
      });
      const betaLogs = await db.auditLog.findMany({
        where: { companyId: tenantBCompanyId },
      });

      expect(alphaLogs.length).toBeGreaterThan(0);
      expect(betaLogs.length).toBeGreaterThan(0);

      for (const log of alphaLogs) {
        expect(log.companyId).toBe(tenantACompanyId);
      }
      for (const log of betaLogs) {
        expect(log.companyId).toBe(tenantBCompanyId);
      }
    });

    it("should ensure company currency and liquid reserves are strictly isolated", async () => {
      const companyA = await getCompanyById(tenantACompanyId);
      const companyB = await getCompanyById(tenantBCompanyId);

      expect(companyA?.baseCurrency).toBe("PKR");
      expect(companyB?.baseCurrency).toBe("USD");
      expect(new Decimal(companyA?.liquidReserve ?? 0).toFixed(2)).toBe("1000000.00");
      expect(new Decimal(companyB?.liquidReserve ?? 0).toFixed(2)).toBe("50000.00");
    });
  });
});
