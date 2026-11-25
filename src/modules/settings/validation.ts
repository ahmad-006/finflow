import { z } from "zod";
import { passwordSchema } from "@/modules/auth/validation";

const optionalTrimmed = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} cannot exceed ${max} characters.`)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null));

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
  billingEmail: z
    .union([
      z.string().trim().email("Please enter a valid billing email address."),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  phone: optionalTrimmed(40, "Phone number"),
  address: optionalTrimmed(300, "Business address"),
  taxId: optionalTrimmed(60, "Tax ID"),
  remittanceInstructions: optionalTrimmed(1000, "Remittance instructions"),
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
