import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { hashPassword, verifyPassword } from "./password";
import { signSession, SESSION_MAX_AGE_SECONDS } from "./session";
import type { RegisterInput, LoginInput, SessionPayload, SafeUser, SafeCompany, AuthSessionData } from "./types";
import { registerSchema, loginSchema } from "./validation";

/**
 * Registers a new company and owner user in a single atomic Prisma transaction.
 */
export async function registerUserAndCompany(rawInput: RegisterInput): Promise<AuthSessionData> {
  const validated = registerSchema.parse(rawInput);

  // Check if user email is already registered
  const existingUser = await db.user.findUnique({
    where: { email: validated.email },
  });

  if (existingUser) {
    throw new Error("A user with this email address already exists.");
  }

  // Hash password using native crypto scrypt + salt
  const passwordHash = await hashPassword(validated.password);

  // Format liquidReserve and safetyBuffer with Decimal precision
  const liquidReserveDecimal = new Prisma.Decimal(new Decimal(validated.liquidReserve).toFixed(2));
  const safetyBufferDecimal = new Prisma.Decimal(new Decimal(validated.safetyBuffer).toFixed(2));

  // Execute in a single ACID Prisma transaction
  const result = await db.$transaction(async (tx) => {
    // 1. Create company
    const company = await tx.company.create({
      data: {
        name: validated.companyName,
        baseCurrency: validated.baseCurrency,
        liquidReserve: liquidReserveDecimal,
        safetyBuffer: safetyBufferDecimal,
      },
    });

    // 2. Create user with OWNER role
    const user = await tx.user.create({
      data: {
        companyId: company.id,
        email: validated.email,
        fullName: validated.fullName,
        passwordHash,
        role: "OWNER",
      },
    });

    // 3. Create initial workspace audit log
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
  });

  const sessionPayload: SessionPayload = {
    userId: result.user.id,
    companyId: result.company.id,
    email: result.user.email,
    fullName: result.user.fullName,
    role: result.user.role,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };

  const token = signSession(sessionPayload);

  const safeUser: SafeUser = {
    id: result.user.id,
    companyId: result.user.companyId,
    email: result.user.email,
    fullName: result.user.fullName,
    role: result.user.role,
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

  const isPasswordValid = await verifyPassword(validated.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password.");
  }

  const sessionPayload: SessionPayload = {
    userId: user.id,
    companyId: user.companyId,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };

  const token = signSession(sessionPayload);

  const safeUser: SafeUser = {
    id: user.id,
    companyId: user.companyId,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
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
    include: { company: true },
  });

  if (!user) return null;

  const safeUser: SafeUser = {
    id: user.id,
    companyId: user.companyId,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return {
    ...safeUser,
    company: user.company,
  };
}

/**
 * Fetches company by ID.
 */
export async function getCompanyById(companyId: string) {
  return db.company.findUnique({
    where: { id: companyId },
  });
}
