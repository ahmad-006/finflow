export const EXPENSE_CATEGORIES = [
  "PAYROLL",
  "RENT",
  "UTILITIES",
  "SUPPLIERS",
  "SOFTWARE",
  "TAX",
  "OTHER",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_RECURRENCES = [
  "NONE",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "ANNUALLY",
] as const;

export type ExpenseRecurrence = (typeof EXPENSE_RECURRENCES)[number];

export const EXPENSE_STATUSES = ["SCHEDULED", "OVERDUE", "PAID"] as const;

export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export interface ExpenseRecord {
  id: string;
  companyId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  dueDate: Date | string;
  recurrence: ExpenseRecurrence;
  isPaid: boolean;
  paidAt: Date | string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  status: ExpenseStatus;
}

export interface ExpenseWithCompany extends ExpenseRecord {
  company: {
    id: string;
    name: string;
    baseCurrency: string;
  };
}

export interface CreateExpenseInput {
  title: string;
  category: ExpenseCategory;
  amount: number;
  dueDate: Date | string;
  recurrence?: ExpenseRecurrence;
  notes?: string | null;
}

export interface UpdateExpenseInput {
  id?: string;
  title?: string;
  category?: ExpenseCategory;
  amount?: number;
  dueDate?: Date | string;
  recurrence?: ExpenseRecurrence;
  notes?: string | null;
}

export interface MarkExpensePaidInput {
  paymentDate?: Date | string;
  paymentMethod?: string;
  reference?: string | null;
}

export interface ExpenseFilters {
  status?: ExpenseStatus | "ALL";
  category?: ExpenseCategory | "ALL";
  recurrence?: ExpenseRecurrence | "ALL";
  search?: string;
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface ExpenseKPIs {
  totalScheduled: number;
  totalScheduledAmount: number;
  scheduledAmount: number;
  overdueAmount: number;
  next30DaysOutflow: number;
  monthlyRecurringBurn: number;
  categoryBreakdown: Record<ExpenseCategory, number>;
  counts: {
    total: number;
    scheduled: number;
    overdue: number;
    paid: number;
  };
}

export interface ExpenseActionResult<T = ExpenseRecord> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}
