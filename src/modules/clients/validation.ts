import { z } from "zod";

export const PAYMENT_TERMS_OPTIONS = [7, 15, 30, 45, 60, 90] as const;

/**
 * Normalizes payment terms inputs such as "Net 30", "30 days", "30", 30, or "" to a numeric day count.
 */
export function parsePaymentTerms(val: unknown): number {
  if (val === undefined || val === null) {
    return 30;
  }
  if (typeof val === "number") {
    return Number.isFinite(val) ? val : NaN;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "") {
      return 30;
    }
    const match = trimmed.match(/^(?:net\s*[-]?\s*)?(\d+)(?:\s*days?)?$/i);
    if (match) {
      return parseInt(match[1], 10);
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

const paymentTermsSchema = z.preprocess(
  (val) => parsePaymentTerms(val),
  z
    .number({ message: "Payment terms must be a valid number of days" })
    .int("Payment terms must be an integer")
    .refine((val) => [7, 15, 30, 45, 60, 90].includes(val), {
      message: "Payment terms must be one of: 7, 15, 30, 45, 60, or 90 days",
    })
);

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
  paymentTermsDays: paymentTermsSchema.default(30),
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

export const bulkClientRowSchema = z.object({
  rowNumber: z.coerce.number().int().positive().optional(),
  clientName: createClientSchema.shape.clientName,
  email: createClientSchema.shape.email,
  phone: createClientSchema.shape.phone,
  address: createClientSchema.shape.address,
  paymentTermsDays: paymentTermsSchema.default(30),
});

export const bulkImportClientsSchema = z.object({
  rows: z
    .array(bulkClientRowSchema)
    .min(1, "At least one client row is required")
    .max(500, "Maximum 500 client rows allowed per import"),
  options: z
    .object({
      duplicateMode: z.enum(["skip", "fail"]).default("skip"),
    })
    .optional(),
});

export type CreateClientSchemaInput = z.infer<typeof createClientSchema>;
export type UpdateClientSchemaInput = z.infer<typeof updateClientSchema>;
export type ClientFilterSchemaInput = z.infer<typeof clientFilterSchema>;
export type BulkClientRowSchemaInput = z.infer<typeof bulkClientRowSchema>;
export type BulkImportClientsSchemaInput = z.infer<typeof bulkImportClientsSchema>;
