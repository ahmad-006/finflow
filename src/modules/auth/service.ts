import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { hashPassword, verifyPassword } from "./password";
import { createSessionToken, signSession, SESSION_MAX_AGE_SECONDS } from "./session";
import { generateNumericOtp, hashToken, verifyTokenHash } from "@/lib/tokens";
import { sendSignupOtpEmail, sendPasswordResetEmail } from "@/lib/mail";
import type { RegisterInput, LoginInput, SessionPayload, SafeUser, SafeCompany, AuthSessionData } from "./types";
import { registerSchema, loginSchema } from "./validation";

/**
 * Registers a new company and owner user in a single atomic Prisma transaction.
 * Creates an unverified user (emailVerified = false), generates a 6-digit OTP,
 * hashes the OTP, stores it in verificationCode, and dispatches the verification email.
 */
export async function registerUser(rawInput: RegisterInput): Promise<AuthSessionData> {
  const validated = registerSchema.parse(rawInput);

  // Check if invitation token is supplied
  if (validated.inviteToken) {
    const invitation = await db.invitation.findUnique({
      where: { token: validated.inviteToken.trim() },
      include: { company: true },
    });

    if (!invitation) {
      throw new Error("Invalid invitation token. The invitation may have been revoked.");
    }

    if (new Date() > invitation.expiresAt) {
      throw new Error("This invitation has expired. Please request a new invitation.");
    }

    // Check if user email is already registered
    const existingUser = await db.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      throw new Error("A user with this email address already exists.");
    }

    const passwordHash = await hashPassword(validated.password);

    const result = await db.$transaction(async (tx) => {
      // Create user assigned to existing company with assigned role
      const user = await tx.user.create({
        data: {
          companyId: invitation.companyId,
          email: validated.email,
          fullName: validated.fullName,
          passwordHash,
          role: invitation.role,
          emailVerified: true,
          onboardingCompleted: true,
          authProvider: "LOCAL",
        },
      });

      // Remove accepted invitation
      await tx.invitation.delete({
        where: { id: invitation.id },
      });

      // Log join event
      await tx.auditLog.create({
        data: {
          companyId: invitation.companyId,
          userId: user.id,
          entityType: "WORKSPACE",
          entityId: invitation.companyId,
          action: "JOIN_WORKSPACE",
          details: JSON.stringify({
            userId: user.id,
            email: user.email,
            role: invitation.role,
            invitedByUserId: invitation.invitedByUserId,
          }),
        },
      });

      return { company: invitation.company, user };
    }, { timeout: 30000, maxWait: 20000 });

    const sessionPayload: SessionPayload = {
      userId: result.user.id,
      companyId: result.company.id,
      email: result.user.email,
      fullName: result.user.fullName,
      role: result.user.role,
      emailVerified: true,
      onboardingCompleted: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    };

    const token = await createSessionToken(sessionPayload);

    const safeUser: SafeUser = {
      id: result.user.id,
      companyId: result.user.companyId,
      email: result.user.email,
      fullName: result.user.fullName,
      role: result.user.role,
      emailVerified: true,
      onboardingCompleted: true,
      createdAt: result.user.createdAt,
      updatedAt: result.user.updatedAt,
    };

    const safeCompany: SafeCompany = {
      id: result.company.id,
      name: result.company.name,
      baseCurrency: result.company.baseCurrency,
      liquidReserve: result.company.liquidReserve.toString(),
      safetyBuffer: result.company.safetyBuffer.toString(),
      createdAt: result.company.createdAt,
      updatedAt: result.company.updatedAt,
    };

    return {
      user: safeUser,
      company: safeCompany,
      token,
    };
  }

  // Check if user email is already registered
  const existingUser = await db.user.findUnique({
    where: { email: validated.email },
  });

  if (existingUser) {
    throw new Error("A user with this email address already exists.");
  }

  // Hash password using native bcrypt
  const passwordHash = await hashPassword(validated.password);

  // Format liquidReserve and safetyBuffer with Decimal precision
  const companyName = validated.companyName?.trim() || `${validated.fullName.trim()}'s Company`;
  const baseCurrency = validated.baseCurrency || "PKR";
  const liquidReserveDecimal = new Prisma.Decimal(new Decimal(validated.liquidReserve ?? 0).toFixed(2));
  const safetyBufferDecimal = new Prisma.Decimal(new Decimal(validated.safetyBuffer ?? 0).toFixed(2));

  // Generate 6-digit OTP and SHA-256 HMAC hash
  const otp = generateNumericOtp();
  const codeHash = hashToken(otp);
  const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Execute in a single ACID Prisma transaction
  const result = await db.$transaction(async (tx) => {
    // 1. Create company
    const company = await tx.company.create({
      data: {
        name: companyName,
        baseCurrency: baseCurrency,
        liquidReserve: liquidReserveDecimal,
        safetyBuffer: safetyBufferDecimal,
      },
    });

    // 2. Create user with OWNER role, unverified email, and incomplete onboarding
    const user = await tx.user.create({
      data: {
        companyId: company.id,
        email: validated.email,
        fullName: validated.fullName,
        passwordHash,
        role: "OWNER",
        emailVerified: false,
        onboardingCompleted: false,
        authProvider: "LOCAL",
      },
    });

    // 3. Store hashed OTP in verification_codes table
    await tx.verificationCode.create({
      data: {
        email: user.email,
        codeHash,
        type: "SIGNUP_OTP",
        expiresAt: otpExpiresAt,
      },
    });

    // 4. Create initial workspace audit log
    await tx.auditLog.create({
      data: {
        companyId: company.id,
        userId: user.id,
        entityType: "WORKSPACE",
        entityId: company.id,
        action: "CREATE",
        details: JSON.stringify({
          companyName: company.name,
          baseCurrency: company.baseCurrency,
          ownerEmail: user.email,
        }),
      },
    });

    return { company, user };
  }, { timeout: 30000, maxWait: 20000 });

  // Dispatch signup verification email with plaintext OTP
  await sendSignupOtpEmail(result.user.email, otp);

  const sessionPayload: SessionPayload = {
    userId: result.user.id,
    companyId: result.company.id,
    email: result.user.email,
    fullName: result.user.fullName,
    role: result.user.role,
    emailVerified: false,
    onboardingCompleted: false,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };

  const token = await createSessionToken(sessionPayload);

  const safeUser: SafeUser = {
    id: result.user.id,
    companyId: result.user.companyId,
    email: result.user.email,
    fullName: result.user.fullName,
    role: result.user.role,
    emailVerified: false,
    onboardingCompleted: false,
    createdAt: result.user.createdAt,
    updatedAt: result.user.updatedAt,
  };

  const safeCompany: SafeCompany = {
    id: result.company.id,
    name: result.company.name,
    baseCurrency: result.company.baseCurrency,
    liquidReserve: result.company.liquidReserve.toString(),
    safetyBuffer: result.company.safetyBuffer.toString(),
    createdAt: result.company.createdAt,
    updatedAt: result.company.updatedAt,
  };

  return {
    user: safeUser,
    company: safeCompany,
    token,
  };
}

export const registerUserAndCompany = registerUser;

/**
 * Verifies a 6-digit signup OTP.
 * Validates hash, verifies attempt limit, marks usedAt, and sets user.emailVerified = true.
 */
export async function verifySignupOtp(email: string, code: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const record = await db.verificationCode.findFirst({
    where: {
      email: normalizedEmail,
      type: "SIGNUP_OTP",
      usedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new Error("No verification code found. Please request a new code.");
  }

  if (new Date() > record.expiresAt) {
    throw new Error("Verification code has expired. Please request a new code.");
  }

  if (record.attempts >= record.maxAttempts) {
    throw new Error("Too many failed attempts. This code is locked. Please request a new code.");
  }

  const isValid = verifyTokenHash(code.trim(), record.codeHash);
  if (!isValid) {
    await db.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error("Invalid verification code.");
  }

  const now = new Date();
  await db.verificationCode.update({
    where: { id: record.id },
    data: { usedAt: now },
  });

  const updatedUser = await db.user.update({
    where: { email: normalizedEmail },
    data: { emailVerified: true },
    include: { company: true },
  });

  await db.auditLog.create({
    data: {
      companyId: updatedUser.companyId,
      userId: updatedUser.id,
      entityType: "USER",
      entityId: updatedUser.id,
      action: "UPDATE",
      details: JSON.stringify({ event: "EMAIL_VERIFIED", email: normalizedEmail }),
    },
  });

  return updatedUser;
}

/**
 * Resends a signup verification code with 60s rate limit enforcement.
 */
export async function resendSignupOtp(email: string): Promise<{ success: boolean }> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new Error("User with this email not found.");
  }

  const latestRecord = await db.verificationCode.findFirst({
    where: {
      email: normalizedEmail,
      type: "SIGNUP_OTP",
    },
    orderBy: { createdAt: "desc" },
  });

  if (latestRecord) {
    const elapsedMs = Date.now() - latestRecord.createdAt.getTime();
    if (elapsedMs < 60 * 1000) {
      const waitSeconds = Math.ceil((60000 - elapsedMs) / 1000);
      throw new Error(`Please wait ${waitSeconds} seconds before requesting a new code.`);
    }
  }

  const otp = generateNumericOtp();
  const codeHash = hashToken(otp);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.verificationCode.create({
    data: {
      email: normalizedEmail,
      codeHash,
      type: "SIGNUP_OTP",
      expiresAt,
    },
  });

  await sendSignupOtpEmail(normalizedEmail, otp);

  return { success: true };
}

/**
 * Initiates a password reset flow. Generates hashed OTP and emails reset instructions.
 * Always returns success to prevent user email enumeration.
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (user) {
    const otp = generateNumericOtp();
    const codeHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.verificationCode.create({
      data: {
        email: normalizedEmail,
        codeHash,
        type: "PASSWORD_RESET_OTP",
        expiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?email=${encodeURIComponent(normalizedEmail)}&code=${encodeURIComponent(otp)}`;

    await sendPasswordResetEmail(normalizedEmail, otp, resetUrl);
  }

  return {
    success: true,
    message: "If an account exists with this email address, a password reset code has been sent. Please check your inbox and spam folder.",
  };
}

/**
 * Validates a reset OTP and updates the user's password.
 */
export async function resetPasswordWithOtp(
  email: string,
  code: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new Error("Invalid or expired reset code.");
  }

  const record = await db.verificationCode.findFirst({
    where: {
      email: normalizedEmail,
      type: "PASSWORD_RESET_OTP",
      usedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new Error("Invalid or expired reset code.");
  }

  if (new Date() > record.expiresAt) {
    throw new Error("Reset code has expired. Please request a new one.");
  }

  if (record.attempts >= record.maxAttempts) {
    throw new Error("Too many failed attempts. This code is locked. Please request a new one.");
  }

  const isValid = verifyTokenHash(code.trim(), record.codeHash);
  if (!isValid) {
    await db.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error("Invalid reset code.");
  }

  const newPasswordHash = await hashPassword(newPassword);
  const now = new Date();

  await db.verificationCode.update({
    where: { id: record.id },
    data: { usedAt: now },
  });

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: newPasswordHash },
  });

  await db.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      entityType: "USER",
      entityId: user.id,
      action: "UPDATE",
      details: JSON.stringify({ event: "PASSWORD_RESET_WITH_OTP", email: normalizedEmail }),
    },
  });

  return {
    success: true,
    message: "Password has been successfully updated.",
  };
}

/**
 * Authenticates user credentials and returns session payload & token.
 */
export async function loginUser(rawInput: LoginInput): Promise<AuthSessionData> {
  const validated = loginSchema.parse(rawInput);

  const user = await db.user.findUnique({
    where: { email: validated.email },
    include: { company: true },
  });

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const isPasswordValid = await verifyPassword(validated.password, user.passwordHash || "");
  if (!isPasswordValid) {
    throw new Error("Invalid email or password.");
  }

  const sessionPayload: SessionPayload = {
    userId: user.id,
    companyId: user.companyId,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    emailVerified: user.emailVerified,
    onboardingCompleted: user.onboardingCompleted !== false,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };

  const token = await createSessionToken(sessionPayload);

  const safeUser: SafeUser = {
    id: user.id,
    companyId: user.companyId,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    emailVerified: user.emailVerified,
    onboardingCompleted: user.onboardingCompleted !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const safeCompany: SafeCompany = {
    id: user.company.id,
    name: user.company.name,
    baseCurrency: user.company.baseCurrency,
    liquidReserve: user.company.liquidReserve.toString(),
    safetyBuffer: user.company.safetyBuffer.toString(),
    createdAt: user.company.createdAt,
    updatedAt: user.company.updatedAt,
  };

  return {
    user: safeUser,
    company: safeCompany,
    token,
  };
}

/**
 * Fetches user and company by user ID.
 */
export async function getUserWithCompany(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      companyId: true,
      email: true,
      fullName: true,
      role: true,
      emailVerified: true,
      onboardingCompleted: true,
      createdAt: true,
      updatedAt: true,
      company: true,
    },
  });

  if (!user) return null;

  return user;
}

/**
 * Fetches company by ID.
 */
export async function getCompanyById(companyId: string) {
  return db.company.findUnique({
    where: { id: companyId },
  });
}

/**
 * Accepts a workspace invitation and joins the target company with the assigned role.
 * Can be called with userId for an existing user or with credentials for a new user.
 */
export async function acceptInvitation(
  token: string,
  userId?: string,
  credentials?: { fullName?: string; password?: string }
): Promise<AuthSessionData> {
  const normalizedToken = token.trim();
  const invitation = await db.invitation.findUnique({
    where: { token: normalizedToken },
    include: { company: true },
  });

  if (!invitation) {
    throw new Error("Invalid invitation token. The invitation may have been revoked.");
  }

  if (new Date() > invitation.expiresAt) {
    throw new Error("This invitation has expired. Please request a new invitation.");
  }

  const result = await db.$transaction(async (tx) => {
    let targetUser;

    if (userId) {
      targetUser = await tx.user.update({
        where: { id: userId },
        data: {
          companyId: invitation.companyId,
          role: invitation.role,
          onboardingCompleted: true,
        },
      });
    } else {
      const existingUser = await tx.user.findUnique({
        where: { email: invitation.email.toLowerCase() },
      });

      if (existingUser) {
        if (credentials?.password && existingUser.passwordHash) {
          const valid = await verifyPassword(credentials.password, existingUser.passwordHash);
          if (!valid) {
            throw new Error("Invalid password for existing account.");
          }
        }
        targetUser = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            companyId: invitation.companyId,
            role: invitation.role,
            onboardingCompleted: true,
          },
        });
      } else {
        if (!credentials?.password) {
          throw new Error("Password is required to set up your account.");
        }
        const passwordHash = await hashPassword(credentials.password);
        const fullName =
          credentials.fullName?.trim() || invitation.email.split("@")[0] || "Team Member";

        targetUser = await tx.user.create({
          data: {
            companyId: invitation.companyId,
            email: invitation.email.toLowerCase(),
            fullName,
            passwordHash,
            role: invitation.role,
            emailVerified: true,
            onboardingCompleted: true,
            authProvider: "LOCAL",
          },
        });
      }
    }

    await tx.invitation.delete({
      where: { id: invitation.id },
    });

    await tx.auditLog.create({
      data: {
        companyId: invitation.companyId,
        userId: targetUser.id,
        entityType: "WORKSPACE",
        entityId: invitation.companyId,
        action: "JOIN_WORKSPACE",
        details: JSON.stringify({
          userId: targetUser.id,
          email: targetUser.email,
          role: invitation.role,
          invitedByUserId: invitation.invitedByUserId,
        }),
      },
    });

    return { user: targetUser, company: invitation.company };
  }, { timeout: 30000, maxWait: 20000 });

  const sessionPayload: SessionPayload = {
    userId: result.user.id,
    companyId: result.company.id,
    email: result.user.email,
    fullName: result.user.fullName,
    role: result.user.role,
    emailVerified: result.user.emailVerified,
    onboardingCompleted: true,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };

  const sessionToken = await createSessionToken(sessionPayload);

  return {
    user: {
      id: result.user.id,
      companyId: result.user.companyId,
      email: result.user.email,
      fullName: result.user.fullName,
      role: result.user.role,
      emailVerified: result.user.emailVerified,
      onboardingCompleted: true,
      createdAt: result.user.createdAt,
      updatedAt: result.user.updatedAt,
    },
    company: {
      id: result.company.id,
      name: result.company.name,
      baseCurrency: result.company.baseCurrency,
      liquidReserve: result.company.liquidReserve.toString(),
      safetyBuffer: result.company.safetyBuffer.toString(),
      createdAt: result.company.createdAt,
      updatedAt: result.company.updatedAt,
    },
    token: sessionToken,
  };
}

/**
 * Validates an invitation token and returns details for UI display.
 */
export async function getInvitationByToken(token: string) {
  const invitation = await db.invitation.findUnique({
    where: { token: token.trim() },
    include: {
      company: {
        select: { id: true, name: true, baseCurrency: true },
      },
    },
  });

  if (!invitation) {
    return null;
  }

  const isExpired = new Date() > invitation.expiresAt;

  return {
    id: invitation.id,
    companyId: invitation.companyId,
    companyName: invitation.company.name,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    isExpired,
  };
}
