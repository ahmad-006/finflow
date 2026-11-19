import { z } from "zod";
import { EXPENSE_CATEGORIES, EXPENSE_RECURRENCES, EXPENSE_STATUSES } from "./types";

export const createExpenseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .min(2, "Title must be at least 2 characters")
    .max(120, "Title cannot exceed 120 characters"),
  category: z.enum(EXPENSE_CATEGORIES, {
    message: "Please select a valid category (PAYROLL, RENT, UTILITIES, SUPPLIERS, SOFTWARE, TAX, OTHER)",
  }),
  amount: z.coerce
    .number()
    .positive("Amount must be greater than zero")
    .max(10_000_000_000, "Amount exceeds maximum limit"),
  dueDate: z.coerce.date({
    message: "Please enter a valid due date",
  }),
  recurrence: z
    .enum(EXPENSE_RECURRENCES, {
      message: "Please select a valid recurrence (NONE, WEEKLY, MONTHLY, QUARTERLY, ANNUALLY)",
    })
    .default("NONE"),
  notes: z
    .string()
    .trim()
    .max(500, "Notes must be under 500 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const updateExpenseSchema = z.object({
  id: z.string().min(1, "Expense ID is required").optional(),
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(120, "Title cannot exceed 120 characters")
    .optional(),
  category: z
    .enum(EXPENSE_CATEGORIES, {
      message: "Please select a valid category (PAYROLL, RENT, UTILITIES, SUPPLIERS, SOFTWARE, TAX, OTHER)",
    })
    .optional(),
  amount: z.coerce
    .number()
    .positive("Amount must be greater than zero")
    .max(10_000_000_000, "Amount exceeds maximum limit")
    .optional(),
  dueDate: z.coerce
    .date({
      message: "Please enter a valid due date",
    })
    .optional(),
  recurrence: z
    .enum(EXPENSE_RECURRENCES, {
      message: "Please select a valid recurrence (NONE, WEEKLY, MONTHLY, QUARTERLY, ANNUALLY)",
    })
    .optional(),
  notes: z
    .string()
    .trim()
    .max(500, "Notes must be under 500 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const markExpensePaidSchema = z.object({
  paymentDate: z.coerce.date().optional(),
  paymentMethod: z.string().trim().min(1).default("BANK_TRANSFER").optional(),
  reference: z
    .string()
    .trim()
    .max(255, "Reference must be under 255 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const expenseFilterSchema = z.object({
  status: z.enum(["ALL", ...EXPENSE_STATUSES]).optional().default("ALL"),
  category: z.enum(["ALL", ...EXPENSE_CATEGORIES]).optional().default("ALL"),
  recurrence: z.enum(["ALL", ...EXPENSE_RECURRENCES]).optional().default("ALL"),
  search: z.string().trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
