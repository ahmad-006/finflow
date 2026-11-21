import { describe, it, expect, afterAll } from "bun:test";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import {
  registerAction,
  loginAction,
  verifyEmailAction,
  resendOtpAction,
  forgotPasswordAction,
  resetPasswordAction,
} from "@/modules/auth/actions";
import { setSessionCookie, clearSessionCookie } from "@/modules/auth/session";

describe("Domain 1: Auth Server Actions (verifyEmailAction, resendOtpAction, etc.)", () => {
  const createdCompanyIds: string[] = [];

  afterAll(async () => {
    for (const companyId of createdCompanyIds) {
      try {
        await db.company.delete({ where: { id: companyId } });
      } catch {
        // cleanup
      }
    }
  });

  const timestamp = Date.now() + 300;
  const testEmail = `actions-user-${timestamp}@finflow-actions.test`;
  const initialPassword = "ActionPassword2026!#";
  const newPassword = "UpdatedActionPassword2026!#";

  it("should register user via registerAction with noRedirect", async () => {
    const res = await registerAction({
      companyName: `Action Corp ${timestamp}`,
      fullName: "Action User",
      email: testEmail,
      password: initialPassword,
      noRedirect: true,
    });

    expect(res.success).toBe(true);
    expect(res.redirectUrl).toBe("/verify-email");
    const sessionData = res.data as { user: { companyId: string } };
    createdCompanyIds.push(sessionData.user.companyId);
  }, 40000);

  it("should enforce rate limit on resendOtpAction when called immediately", async () => {
    const res = await resendOtpAction({
      email: testEmail,
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("seconds before requesting a new code");
  }, 25000);

  it("should verify email with valid OTP via verifyEmailAction", async () => {
    const validOtp = "555111";

    const record = await db.verificationCode.findFirst({
      where: { email: testEmail, type: "SIGNUP_OTP" },
      orderBy: { createdAt: "desc" },
    });

    expect(record).not.toBeNull();
    await db.verificationCode.update({
      where: { id: record!.id },
      data: {
        codeHash: hashToken(validOtp),
        attempts: 0,
        usedAt: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const res = await verifyEmailAction({
      email: testEmail,
      code: validOtp,
      noRedirect: true,
    });

    expect(res.success).toBe(true);
    expect(res.redirectUrl).toBe("/onboarding");

    const user = await db.user.findUnique({
      where: { email: testEmail },
    });
    expect(user?.emailVerified).toBe(true);
  }, 30000);

  it("should request password reset via forgotPasswordAction", async () => {
    const res = await forgotPasswordAction({
      email: testEmail,
    });

    expect(res.success).toBe(true);

    const record = await db.verificationCode.findFirst({
      where: { email: testEmail, type: "PASSWORD_RESET_OTP" },
      orderBy: { createdAt: "desc" },
    });
    expect(record).not.toBeNull();
  }, 25000);

  it("should reject resetPasswordAction if passwords do not match", async () => {
    const res = await resetPasswordAction({
      email: testEmail,
      code: "123456",
      newPassword,
      confirmPassword: "MismatchPassword123!#",
      noRedirect: true,
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe("Passwords do not match.");
  }, 25000);

  it("should reset password via resetPasswordAction with valid code", async () => {
    const resetOtp = "888222";

    const record = await db.verificationCode.findFirst({
      where: { email: testEmail, type: "PASSWORD_RESET_OTP" },
      orderBy: { createdAt: "desc" },
    });

    await db.verificationCode.update({
      where: { id: record!.id },
      data: {
        codeHash: hashToken(resetOtp),
        attempts: 0,
        usedAt: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const res = await resetPasswordAction({
      email: testEmail,
      code: resetOtp,
      newPassword,
      confirmPassword: newPassword,
      noRedirect: true,
    });

    expect(res.success).toBe(true);
    expect(res.redirectUrl).toBe("/login?reset=success");

    // Login with new password should now succeed
    const loginRes = await loginAction({
      email: testEmail,
      password: newPassword,
      noRedirect: true,
    });
    expect(loginRes.success).toBe(true);
    expect(loginRes.redirectUrl).toBe("/dashboard");
  }, 35000);
});
