import { z } from "zod";

const toUpper = (str: string) => str.replace(/[a-z]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 32));

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Password must contain at least one capital letter")
  .regex(/[a-z]/, "Password must contain at least one small letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export interface PasswordStrengthReport {
  length: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  number: boolean;
  special: boolean;
  isValid: boolean;
}

/**
 * Validates password rules individually for live UI checklists.
 */
export function checkPasswordStrength(password: string): PasswordStrengthReport {
  const pwd = password || "";
  const length = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const number = /[0-9]/.test(pwd);
  const special = /[^A-Za-z0-9]/.test(pwd);
  return {
    length,
    hasUpper,
    hasLower,
    number,
    special,
    isValid: length && hasUpper && hasLower && number && special,
  };
}

export const registerSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be under 100 characters"),
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be under 100 characters"),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .toLowerCase(),
  password: passwordSchema,
  baseCurrency: z
    .string()
    .trim()
    .min(3, "Currency code must be at least 3 characters")
    .max(5)
    .default("PKR")
    .transform((val) => toUpper(val)),
  liquidReserve: z
    .union([z.number(), z.string()])
    .optional()
    .default(0)
    .transform((val) => {
      if (val === undefined || val === null || val === "") return 0;
      const num = typeof val === "string" ? parseFloat(val) : val;
      if (isNaN(num) || num < 0) {
        throw new Error("Opening cash reserve must be a non-negative number");
      }
      return num;
    }),
  safetyBuffer: z
    .union([z.number(), z.string()])
    .optional()
    .default(0)
    .transform((val) => {
      if (val === undefined || val === null || val === "") return 0;
      const num = typeof val === "string" ? parseFloat(val) : val;
      if (isNaN(num) || num < 0) {
        throw new Error("Safety buffer must be a non-negative number");
      }
      return num;
    }),
  noRedirect: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Password is required"),
  noRedirect: z.boolean().optional(),
});
