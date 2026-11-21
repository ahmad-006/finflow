import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/modules/auth/password";
import type {
  CompanySettingsInput,
  CompanySettingsRecord,
  UserProfileInput,
  UserProfileRecord,
} from "./types";
import {
  updateCompanySettingsSchema,
  updateUserProfileSchema,
} from "./validation";

/**
 * Returns company settings by company ID.
 */
export async function getCompanySettings(companyId: string): Promise<CompanySettingsRecord> {
  if (!companyId) {
    throw new Error("Company ID is required.");
  }

  const company = await db.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new Error("Company not found.");
  }

  return {
    id: company.id,
    name: company.name,
    baseCurrency: company.baseCurrency,
    liquidReserve: Number(company.liquidReserve),
    safetyBuffer: Number(company.safetyBuffer),
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

/**
 * Updates company settings and records an audit log entry.
 */
export async function updateCompanySettings(
  companyId: string,
  userId: string,
  data: CompanySettingsInput
): Promise<CompanySettingsRecord> {
  const validated = updateCompanySettingsSchema.parse(data);

  const existing = await db.company.findUnique({
    where: { id: companyId },
  });

  if (!existing) {
    throw new Error("Company not found.");
  }

  return await db.$transaction(async (tx) => {
    const updated = await tx.company.update({
      where: { id: companyId },
      data: {
        name: validated.name,
        liquidReserve: new Prisma.Decimal(validated.liquidReserve),
        safetyBuffer: new Prisma.Decimal(validated.safetyBuffer),
      },
    });

    await tx.auditLog.create({
      data: {
        companyId,
        userId,
        entityType: "WORKSPACE",
        entityId: companyId,
        action: "UPDATE",
        details: JSON.stringify({
          previous: {
            name: existing.name,
            liquidReserve: Number(existing.liquidReserve),
            safetyBuffer: Number(existing.safetyBuffer),
          },
          updated: {
            name: updated.name,
            liquidReserve: Number(updated.liquidReserve),
            safetyBuffer: Number(updated.safetyBuffer),
          },
        }),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      baseCurrency: updated.baseCurrency,
      liquidReserve: Number(updated.liquidReserve),
      safetyBuffer: Number(updated.safetyBuffer),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }, { timeout: 30000, maxWait: 20000 });
}

/**
 * Updates user profile full name and records an audit log entry.
 */
export async function updateUserProfile(
  userId: string,
  data: UserProfileInput
): Promise<UserProfileRecord> {
  const validated = updateUserProfileSchema.parse(data);

  const existing = await db.user.findUnique({
    where: { id: userId },
  });

  if (!existing) {
    throw new Error("User not found.");
  }

  return await db.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        fullName: validated.fullName,
      },
      select: {
        id: true,
        companyId: true,
        email: true,
        fullName: true,
        role: true,
        emailVerified: true,
        authProvider: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: existing.companyId,
        userId,
        entityType: "USER",
        entityId: userId,
        action: "UPDATE",
        details: JSON.stringify({
          field: "fullName",
          previous: existing.fullName,
          updated: updated.fullName,
        }),
      },
    });

    return updated;
  }, { timeout: 30000, maxWait: 20000 });
}

/**
 * Verifies current password and updates to new password hash.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      companyId: true,
      email: true,
      passwordHash: true,
      authProvider: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  if (!user.passwordHash) {
    throw new Error("Account signs in through Google OAuth. Password change is not supported.");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new Error("Current password is incorrect.");
  }

  const newHash = await hashPassword(newPassword);

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    await tx.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        entityType: "USER",
        entityId: user.id,
        action: "UPDATE",
        details: JSON.stringify({
          event: "PASSWORD_CHANGED",
          userId: user.id,
        }),
      },
    });
  }, { timeout: 30000, maxWait: 20000 });

  return {
    success: true,
    message: "Password updated successfully.",
  };
}

/**
 * Returns user profile by user ID.
 */
export async function getUserProfile(userId: string): Promise<UserProfileRecord | null> {
  if (!userId) {
    return null;
  }

  return await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      companyId: true,
      email: true,
      fullName: true,
      role: true,
      emailVerified: true,
      authProvider: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
