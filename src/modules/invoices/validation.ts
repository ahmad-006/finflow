import { z } from "zod";

export const INVOICE_CURRENCIES = ["PKR", "USD", "EUR", "GBP", "AED"] as const;
export const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"] as const;

export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: z
    .string()
    .trim()
    .min(1, "Item description is required")
    .max(255, "Description must be under 255 characters"),
  quantity: z
    .coerce
    .number()
    .positive("Quantity must be greater than 0")
    .max(999999, "Quantity is too large"),
  unitPrice: z
    .coerce
    .number()
    .min(0, "Unit price cannot be negative")
    .max(999999999.99, "Unit price is too large"),
});

export const createInvoiceSchema = z
  .object({
    clientId: z.string().min(1, "Please select a client"),
    currency: z.enum(INVOICE_CURRENCIES, {
      message: "Please select a supported currency (PKR, USD, EUR, GBP, AED)",
    }).default("PKR"),
    exchangeRate: z
      .coerce
      .number()
      .positive("Exchange rate must be positive")
      .default(1.0),
    issueDate: z.coerce.date({
      message: "Please enter a valid issue date",
    }),
    dueDate: z.coerce.date({
      message: "Please enter a valid due date",
    }),
    taxRate: z
      .coerce
      .number()
      .min(0, "Tax rate cannot be negative")
      .max(100, "Tax rate cannot exceed 100%")
      .default(0),
    notes: z
      .string()
      .trim()
      .max(1000, "Notes must be under 1000 characters")
      .optional()
      .nullable()
      .or(z.literal("")),
    items: z
      .array(invoiceItemSchema)
      .min(1, "Invoice must contain at least one line item"),
  })
  .refine(
    (data) => {
      const issue = new Date(data.issueDate).setHours(0, 0, 0, 0);
      const due = new Date(data.dueDate).setHours(0, 0, 0, 0);
      return due >= issue;
    },
    {
      message: "Due date cannot be earlier than issue date",
      path: ["dueDate"],
    }
  );

export const updateInvoiceSchema = z
  .object({
    id: z.string().min(1, "Invoice ID is required"),
    clientId: z.string().min(1, "Please select a client").optional(),
    currency: z.enum(INVOICE_CURRENCIES).optional(),
    exchangeRate: z.coerce.number().positive().optional(),
    issueDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
    taxRate: z.coerce.number().min(0).max(100).optional(),
    notes: z.string().trim().max(1000).optional().nullable().or(z.literal("")),
    items: z.array(invoiceItemSchema).min(1).optional(),
  })
  .refine(
    (data) => {
      if (data.issueDate && data.dueDate) {
        const issue = new Date(data.issueDate).setHours(0, 0, 0, 0);
        const due = new Date(data.dueDate).setHours(0, 0, 0, 0);
        return due >= issue;
      }
      return true;
    },
    {
      message: "Due date cannot be earlier than issue date",
      path: ["dueDate"],
    }
  );

export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  paidAmount: z
    .coerce
    .number()
    .positive("Payment amount must be greater than zero"),
  paidAt: z.coerce.date().optional().default(() => new Date()),
  notes: z.string().trim().max(500).optional().nullable().or(z.literal("")),
});

export const invoiceFilterSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["ALL", ...INVOICE_STATUSES]).default("ALL"),
  clientId: z.string().optional(),
  currency: z.enum(["ALL", ...INVOICE_CURRENCIES]).default("ALL"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["issueDate", "dueDate", "totalAmount", "invoiceNumber"]).default("issueDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type InvoiceItemSchemaInput = z.infer<typeof invoiceItemSchema>;
export type CreateInvoiceSchemaInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceSchemaInput = z.infer<typeof updateInvoiceSchema>;
export type RecordPaymentSchemaInput = z.infer<typeof recordPaymentSchema>;
export type InvoiceFilterSchemaInput = z.infer<typeof invoiceFilterSchema>;
