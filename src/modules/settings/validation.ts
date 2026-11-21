import { z } from "zod";
import { passwordSchema } from "@/modules/auth/validation";

export const updateCompanySettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters.")
    .max(100, "Company name cannot exceed 100 characters."),
  liquidReserve: z.coerce
    .number()
    .min(0, "Liquid reserve cannot be negative."),
  safetyBuffer: z.coerce
    .number()
    .min(0, "Safety buffer cannot be negative."),
});

export const updateUserProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(100, "Full name cannot exceed 100 characters."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required."),
    newPassword: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirm password do not match.",
    path: ["confirmPassword"],
  });

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .toLowerCase(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"], {
    message: "Role must be ADMIN, MEMBER, or VIEWER.",
  }),
});

export const revokeInvitationSchema = z.object({
  invitationId: z.string().min(1, "Invitation ID is required."),
});
