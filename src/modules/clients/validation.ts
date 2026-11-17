import { z } from "zod";

export const PAYMENT_TERMS_OPTIONS = [7, 15, 30, 45, 60, 90] as const;

export const createClientSchema = z.object({
  clientName: z
    .string()
    .trim()
    .min(2, "Client name must be at least 2 characters")
    .max(120, "Client name must be under 120 characters"),
  email: z
    .string()
    .trim()
    .email("Please provide a valid billing email address")
    .toLowerCase(),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number must be under 30 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(300, "Address must be under 300 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  paymentTermsDays: z
    .coerce
    .number()
    .int("Payment terms must be an integer")
    .refine((val) => [7, 15, 30, 45, 60, 90].includes(val), {
      message: "Payment terms must be one of: 7, 15, 30, 45, 60, or 90 days",
    })
    .default(30),
});

export const updateClientSchema = z.object({
  id: z.string().uuid("Invalid client ID format"),
  clientName: z
    .string()
    .trim()
    .min(2, "Client name must be at least 2 characters")
    .max(120, "Client name must be under 120 characters")
    .optional(),
  email: z
    .string()
    .trim()
    .email("Please provide a valid billing email address")
    .toLowerCase()
    .optional(),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number must be under 30 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(300, "Address must be under 300 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  paymentTermsDays: z
    .coerce
    .number()
    .int("Payment terms must be an integer")
    .refine((val) => [7, 15, 30, 45, 60, 90].includes(val), {
      message: "Payment terms must be one of: 7, 15, 30, 45, 60, or 90 days",
    })
    .optional(),
});

export const clientFilterSchema = z.object({
  search: z.string().trim().optional(),
  riskStatus: z.enum(["ALL", "HEALTHY", "WATCHLIST", "CRITICAL"]).default("ALL"),
  sortBy: z.enum(["name", "latency", "outstanding", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateClientSchemaInput = z.infer<typeof createClientSchema>;
export type UpdateClientSchemaInput = z.infer<typeof updateClientSchema>;
export type ClientFilterSchemaInput = z.infer<typeof clientFilterSchema>;
