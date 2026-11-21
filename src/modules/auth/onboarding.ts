import { db } from "@/lib/db";
import type { Company, User } from "@prisma/client";

export interface CompleteCompanyOnboardingInput {
  companyName: string;
  baseCurrency: string;
  liquidReserve: number;
  safetyBuffer: number;
}

export type OnboardedUserWithCompany = User & { company: Company };

/**
 * Atomically completes company workspace setup and transitions user onboarding status:
 * 1. Updates Company details (name, baseCurrency, liquidReserve, safetyBuffer).
 * 2. Marks User onboardingCompleted = true.
 * 3. Records WORKSPACE UPDATE in AuditLog.
 * 4. Returns the updated user with company.
 */
export async function completeCompanyOnboarding(
  userId: string,
  companyId: string,
  data: CompleteCompanyOnboardingInput
): Promise<OnboardedUserWithCompany> {
  return await db.$transaction(
    async (tx) => {
      // 1. Atomically update Company
      await tx.company.update({
        where: { id: companyId },
        data: {
          name: data.companyName,
          baseCurrency: data.baseCurrency,
          liquidReserve: data.liquidReserve,
          safetyBuffer: data.safetyBuffer,
        },
      });

      // 2. Update User (onboardingCompleted: true)
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          onboardingCompleted: true,
        },
        include: {
          company: true,
        },
      });

      // 3. Insert AuditLog (action: 'UPDATE', entityType: 'WORKSPACE', details: JSON.stringify(data))
      await tx.auditLog.create({
        data: {
          companyId,
          userId,
          entityType: "WORKSPACE",
          entityId: companyId,
          action: "UPDATE",
          details: JSON.stringify(data),
        },
      });

      // 4. Return updated user with company
      return updatedUser;
    },
    { timeout: 30000, maxWait: 20000 }
  );
}
