"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { ZodError } from "zod";
import { formatUserError } from "@/lib/errors";
import {
  getSessionTokenFromCookies,
  verifySessionToken,
  getSession,
  createSessionToken,
  setSessionCookie,
} from "@/modules/auth/session";
import type { SessionPayload } from "@/modules/auth/types";
import {
  assertCanManageWorkspace,
  assertCanRead,
  canManageBilling,
} from "@/modules/auth/rbac";
import {
  updateCompanySettings,
  updateUserProfile,
  changePassword,
  inviteMember,
  revokeInvitation,
  getCompanyMembersAndInvitesService,
} from "./service";
import {
  updateCompanySettingsSchema,
  updateUserProfileSchema,
  changePasswordSchema,
  inviteMemberSchema,
  revokeInvitationSchema,
} from "./validation";
import type {
  ActionState,
  CompanySettingsInput,
  CompanySettingsRecord,
  UserProfileInput,
  UserProfileRecord,
  ChangePasswordInput,
  InviteMemberInput,
  InvitationRecord,
  CompanyMembersAndInvitesResult,
} from "./types";

/**
 * Extracts key-value pairs from FormData or a plain JS object.
 */
function extractData(input: unknown): Record<string, unknown> {
  if (typeof FormData !== "undefined" && input instanceof FormData) {
    const obj: Record<string, unknown> = {};
    for (const [key, val] of input.entries()) {
      obj[key] = val;
    }
    return obj;
  }
  if (typeof input === "object" && input !== null) {
    return input as Record<string, unknown>;
  }
  return {};
}

/**
 * Verifies session cookie and extracts authenticated user tenancy.
 */
async function requireAuthSession(sessionOverride?: SessionPayload): Promise<SessionPayload> {
  if (sessionOverride?.userId && sessionOverride?.companyId) {
    return sessionOverride;
  }

  const session = await getSession();
  if (session?.userId && session?.companyId) {
    return session;
  }

  const token = await getSessionTokenFromCookies();
  if (!token) {
    throw new Error("Unauthorized: Please sign in to manage settings.");
  }

  const verified = await verifySessionToken(token);
  if (!verified?.userId || !verified?.companyId) {
    throw new Error("Session expired or invalid: Please sign in again.");
  }

  return verified;
}

/**
 * Formats Zod errors into a field map for form feedback.
 */
function formatZodErrors(err: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const field = issue.path.join(".") || "form";
    if (!fieldErrors[field]) {
      fieldErrors[field] = [];
    }
    fieldErrors[field].push(issue.message);
  }
  return fieldErrors;
}

/**
 * Invalidates cache tags for company settings.
 */
function invalidateCompanyTags(companyId: string): void {
  const tags = [
    `company-${companyId}`,
    `treasury-${companyId}`,
    `dashboard-${companyId}`,
  ];
  for (const tag of tags) {
    try {
      updateTag(tag);
    } catch {
      try {
        revalidateTag(tag, { expire: 0 });
      } catch {
        // Tag invalidation outside active request context
      }
    }
  }
}

/**
 * Invalidates cache tags for user profile.
 */
function invalidateUserTags(userId: string): void {
  const tag = `user-${userId}`;
  try {
    updateTag(tag);
  } catch {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch {
      // Tag invalidation outside active request context
    }
  }
}

/**
 * Server action: Updates company settings and revalidates cache tags.
 */
export async function updateCompanySettingsAction(
  prevState: unknown,
  formData?: FormData | unknown,
  sessionOverride?: SessionPayload
): Promise<ActionState<CompanySettingsRecord>> {
  try {
    const session = await requireAuthSession(sessionOverride);
    assertCanManageWorkspace(session.role);
    const rawData = formData !== undefined ? extractData(formData) : extractData(prevState);

    const input: CompanySettingsInput = {
      name: String(rawData.name || "").trim(),
      liquidReserve:
        rawData.liquidReserve !== undefined && rawData.liquidReserve !== ""
          ? Number(rawData.liquidReserve)
          : 0,
      safetyBuffer:
        rawData.safetyBuffer !== undefined && rawData.safetyBuffer !== ""
          ? Number(rawData.safetyBuffer)
          : 0,
    };

    const validated = updateCompanySettingsSchema.parse(input);
    const updated = await updateCompanySettings(session.companyId, session.userId, validated);

    invalidateCompanyTags(session.companyId);
    try {
      revalidatePath("/settings");
    } catch {
      // Revalidation outside active request context
    }

    return {
      success: true,
      message: "Company settings updated successfully.",
      data: updated,
    };
  } catch (err: unknown) {
    console.error("[updateCompanySettingsAction error]:", err);
    if (err instanceof ZodError) {
      return {
        success: false,
        error: "Please correct the highlighted errors.",
        errors: formatZodErrors(err),
      };
    }
    return {
      success: false,
      error: formatUserError(err, "Failed to update company settings."),
    };
  }
}

/**
 * Server action: Updates user profile name and revalidates cache tags.
 */
export async function updateUserProfileAction(
  prevState: unknown,
  formData?: FormData | unknown,
  sessionOverride?: SessionPayload
): Promise<ActionState<UserProfileRecord>> {
  try {
    const session = await requireAuthSession(sessionOverride);
    const rawData = formData !== undefined ? extractData(formData) : extractData(prevState);

    const input: UserProfileInput = {
      fullName: String(rawData.fullName || "").trim(),
    };

    const validated = updateUserProfileSchema.parse(input);
    const updated = await updateUserProfile(session.userId, validated);

    try {
      const newToken = await createSessionToken({
        ...session,
        fullName: updated.fullName,
      });
      await setSessionCookie(newToken);
    } catch {
      // Session cookie update outside active request context
    }

    invalidateUserTags(session.userId);
    try {
      revalidatePath("/settings");
    } catch {
      // Revalidation outside active request context
    }

    return {
      success: true,
      message: "Profile updated successfully.",
      data: updated,
    };
  } catch (err: unknown) {
    console.error("[updateUserProfileAction error]:", err);
    if (err instanceof ZodError) {
      return {
        success: false,
        error: "Please correct the highlighted errors.",
        errors: formatZodErrors(err),
      };
    }
    return {
      success: false,
      error: formatUserError(err, "Failed to update user profile."),
    };
  }
}

/**
 * Server action: Changes user password with current password verification.
 */
export async function changePasswordAction(
  prevState: unknown,
  formData?: FormData | unknown,
  sessionOverride?: SessionPayload
): Promise<ActionState> {
  try {
    const session = await requireAuthSession(sessionOverride);
    const rawData = formData !== undefined ? extractData(formData) : extractData(prevState);

    const input: ChangePasswordInput = {
      currentPassword: String(rawData.currentPassword || ""),
      newPassword: String(rawData.newPassword || ""),
      confirmPassword: String(rawData.confirmPassword || ""),
    };

    const validated = changePasswordSchema.parse(input);
    const result = await changePassword(
      session.userId,
      validated.currentPassword,
      validated.newPassword
    );

    return {
      success: true,
      message: result.message || "Password updated successfully.",
    };
  } catch (err: unknown) {
    console.error("[changePasswordAction error]:", err);
    if (err instanceof ZodError) {
      return {
        success: false,
        error: "Please correct the highlighted errors.",
        errors: formatZodErrors(err),
      };
    }
    return {
      success: false,
      error: formatUserError(err, "Failed to change password."),
    };
  }
}

/**
 * Server action: Invites a new team member to the workspace.
 * Requires OWNER or ADMIN role.
 */
export async function inviteMemberAction(
  prevStateOrData: unknown,
  formDataOrUndefined?: FormData | unknown,
  sessionOverride?: SessionPayload
): Promise<ActionState<InvitationRecord>> {
  try {
    const session = await requireAuthSession(sessionOverride);
    if (!canManageBilling(session.role)) {
      throw new Error("Forbidden: Only workspace owners and admins can invite team members.");
    }

    const rawData =
      formDataOrUndefined !== undefined
        ? extractData(formDataOrUndefined)
        : extractData(prevStateOrData);

    const input: InviteMemberInput = {
      email: String(rawData.email || "").trim(),
      role: String(rawData.role || "MEMBER") as InviteMemberInput["role"],
    };

    const validated = inviteMemberSchema.parse(input);
    const invitation = await inviteMember(session.companyId, session.userId, validated);

    invalidateCompanyTags(session.companyId);
    try {
      revalidatePath("/settings");
    } catch {
      // Revalidation outside active request context
    }

    return {
      success: true,
      message: `Invitation sent to ${invitation.email}. If not received, please check the spam folder.`,
      data: invitation,
    };
  } catch (err: unknown) {
    console.error("[inviteMemberAction error]:", err);
    if (err instanceof ZodError) {
      return {
        success: false,
        error: "Please correct the highlighted errors.",
        errors: formatZodErrors(err),
      };
    }
    return {
      success: false,
      error: formatUserError(err, "Failed to invite member."),
    };
  }
}

/**
 * Server action: Revokes a pending workspace invitation.
 * Requires OWNER or ADMIN role.
 */
export async function revokeInvitationAction(
  invitationIdOrPrevState: unknown,
  formDataOrUndefined?: FormData | unknown,
  sessionOverride?: SessionPayload
): Promise<ActionState<{ success: boolean; id: string }>> {
  try {
    const session = await requireAuthSession(sessionOverride);
    if (!canManageBilling(session.role)) {
      throw new Error("Forbidden: Only workspace owners and admins can revoke invitations.");
    }

    let invitationId = "";
    if (typeof invitationIdOrPrevState === "string") {
      invitationId = invitationIdOrPrevState.trim();
    } else {
      const rawData =
        formDataOrUndefined !== undefined
          ? extractData(formDataOrUndefined)
          : extractData(invitationIdOrPrevState);
      invitationId = String(rawData.invitationId || rawData.id || "").trim();
    }

    const validated = revokeInvitationSchema.parse({ invitationId });
    const result = await revokeInvitation(session.companyId, validated.invitationId, session.userId);

    invalidateCompanyTags(session.companyId);
    try {
      revalidatePath("/settings");
    } catch {
      // Revalidation outside active request context
    }

    return {
      success: true,
      message: "Invitation revoked successfully.",
      data: result,
    };
  } catch (err: unknown) {
    console.error("[revokeInvitationAction error]:", err);
    if (err instanceof ZodError) {
      return {
        success: false,
        error: "Please correct the highlighted errors.",
        errors: formatZodErrors(err),
      };
    }
    return {
      success: false,
      error: formatUserError(err, "Failed to revoke invitation."),
    };
  }
}

/**
 * Retrieves members and pending invitations for the company workspace.
 * Requires read permission (OWNER, ADMIN, MEMBER, VIEWER).
 */
export async function getCompanyMembersAndInvites(
  companyIdOrSession?: string | SessionPayload,
  sessionOverride?: SessionPayload
): Promise<ActionState<CompanyMembersAndInvitesResult> & CompanyMembersAndInvitesResult> {
  try {
    let targetCompanyId = "";
    let role = "";

    if (sessionOverride?.companyId && sessionOverride?.role) {
      targetCompanyId = sessionOverride.companyId;
      role = sessionOverride.role;
    } else if (
      typeof companyIdOrSession === "object" &&
      companyIdOrSession !== null &&
      "companyId" in companyIdOrSession
    ) {
      targetCompanyId = (companyIdOrSession as SessionPayload).companyId;
      role = (companyIdOrSession as SessionPayload).role;
    } else if (typeof companyIdOrSession === "string" && companyIdOrSession) {
      const session = await requireAuthSession(sessionOverride);
      targetCompanyId = companyIdOrSession;
      role = session.role;
    } else {
      const session = await requireAuthSession(sessionOverride);
      targetCompanyId = session.companyId;
      role = session.role;
    }

    assertCanRead(role);

    const result = await getCompanyMembersAndInvitesService(targetCompanyId);

    return {
      success: true,
      members: result.members,
      invitations: result.invitations,
      data: result,
    };
  } catch (err: unknown) {
    console.error("[getCompanyMembersAndInvites error]:", err);
    const errorMsg = formatUserError(err, "Failed to fetch company members and invitations.");
    return {
      success: false,
      error: errorMsg,
      members: [],
      invitations: [],
      data: { members: [], invitations: [] },
    };
  }
}
