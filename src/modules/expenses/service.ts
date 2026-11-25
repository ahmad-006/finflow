import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import type {
  ExpenseRecord,
  ExpenseStatus,
  ExpenseCategory,
  ExpenseRecurrence,
  CreateExpenseInput,
  UpdateExpenseInput,
  MarkExpensePaidInput,
  ExpenseFilters,
  ExpenseKPIs,
  BulkExpenseRowInput,
  BulkExpenseRowFeedback,
  BulkImportExpensesResult,
} from "./types";
import {
  createExpenseSchema,
  updateExpenseSchema,
  markExpensePaidSchema,
  bulkExpenseRowSchema,
} from "./validation";

type PrismaExpense = Prisma.ExpenseGetPayload<Record<string, never>>;

/**
 * Dynamically resolves expense status:
 * - If isPaid is true -> PAID
 * - If unpaid and dueDate < now -> OVERDUE
 * - Otherwise -> SCHEDULED
 */
export function resolveExpenseStatus(expense: {
  isPaid: boolean;
  dueDate: Date | string;
}): ExpenseStatus {
  if (expense.isPaid) {
    return "PAID";
  }
  const due = expense.dueDate instanceof Date ? expense.dueDate : new Date(expense.dueDate);
  if (due.getTime() < Date.now()) {
    return "OVERDUE";
  }
  return "SCHEDULED";
}

/**
 * Sanitizes a raw Prisma expense record to JS primitives and calculates dynamic status.
 */
export function sanitizeExpense(raw: PrismaExpense): ExpenseRecord {
  return {
    id: raw.id,
    companyId: raw.companyId,
    title: raw.title,
    category: raw.category as ExpenseCategory,
    amount: Number(raw.amount),
    dueDate: raw.dueDate instanceof Date ? raw.dueDate : new Date(raw.dueDate),
    recurrence: raw.recurrence as ExpenseRecurrence,
    isPaid: raw.isPaid,
    paidAt: raw.paidAt ? (raw.paidAt instanceof Date ? raw.paidAt : new Date(raw.paidAt)) : null,
    notes: raw.notes,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(raw.createdAt),
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt : new Date(raw.updatedAt),
    status: resolveExpenseStatus(raw),
  };
}

/**
 * Computes the chronological next due date when advancing by 1 recurrence cycle:
 * - WEEKLY: +7 days
 * - MONTHLY: +1 calendar month (safe against month-end rollover)
 * - QUARTERLY: +3 calendar months
 * - ANNUALLY: +1 calendar year
 */
export function computeNextRecurringDate(
  dueDate: Date | string,
  recurrence: ExpenseRecurrence
): Date {
  const current = dueDate instanceof Date ? new Date(dueDate.getTime()) : new Date(dueDate);
  const next = new Date(current.getTime());

  switch (recurrence) {
    case "WEEKLY": {
      next.setDate(next.getDate() + 7);
      return next;
    }
    case "MONTHLY": {
      const originalDay = current.getDate();
      next.setMonth(next.getMonth() + 1);
      if (next.getDate() !== originalDay) {
        next.setDate(0);
      }
      return next;
    }
    case "QUARTERLY": {
      const originalDay = current.getDate();
      next.setMonth(next.getMonth() + 3);
      if (next.getDate() !== originalDay) {
        next.setDate(0);
      }
      return next;
    }
    case "ANNUALLY": {
      const originalDay = current.getDate();
      next.setFullYear(next.getFullYear() + 1);
      if (next.getDate() !== originalDay) {
        next.setDate(0);
      }
      return next;
    }
    case "NONE":
    default:
      return next;
  }
}

/**
 * Normalizes an expense amount to a 1-month burn equivalent based on its recurrence:
 * - WEEKLY: (amount * 52) / 12
 * - MONTHLY: amount
 * - QUARTERLY: amount / 3
 * - ANNUALLY: amount / 12
 */
export function normalizeMonthlyBurn(
  amount: number,
  recurrence: ExpenseRecurrence
): number {
  const num = Number(amount) || 0;
  switch (recurrence) {
    case "WEEKLY":
      return Math.round(((num * 52) / 12) * 100) / 100;
    case "MONTHLY":
      return Math.round(num * 100) / 100;
    case "QUARTERLY":
      return Math.round((num / 3) * 100) / 100;
    case "ANNUALLY":
      return Math.round((num / 12) * 100) / 100;
    case "NONE":
    default:
      return 0;
  }
}

/**
 * Creates a new expense record with Decimal precision under the specified tenant company.
 */
export async function createExpense(
  companyId: string,
  input: CreateExpenseInput
): Promise<ExpenseRecord> {
  if (!companyId) {
    throw new Error("Tenant companyId is required.");
  }
  const validated = createExpenseSchema.parse(input);

  const expense = await db.expense.create({
    data: {
      companyId,
      title: validated.title,
      category: validated.category,
      amount: new Prisma.Decimal(validated.amount),
      dueDate: validated.dueDate,
      recurrence: validated.recurrence,
      isPaid: false,
      paidAt: null,
      notes: validated.notes || null,
    },
  });

  return sanitizeExpense(expense);
}

/**
 * Retrieves a filtered list of expenses for a tenant with dynamic OVERDUE status resolution.
 */
export async function getExpenses(
  companyId: string,
  filters?: ExpenseFilters
): Promise<ExpenseRecord[]> {
  if (!companyId) {
    throw new Error("Tenant companyId is required.");
  }

  const where: Prisma.ExpenseWhereInput = { companyId };

  if (filters?.category && filters.category !== "ALL") {
    where.category = filters.category;
  }

  if (filters?.recurrence && filters.recurrence !== "ALL") {
    where.recurrence = filters.recurrence;
  }

  if (filters?.startDate || filters?.endDate) {
    where.dueDate = {};
    if (filters.startDate) {
      where.dueDate.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.dueDate.lte = new Date(filters.endDate);
    }
  }

  if (filters?.search && filters.search.trim()) {
    const term = filters.search.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { notes: { contains: term, mode: "insensitive" } },
    ];
  }

  if (filters?.status === "PAID") {
    where.isPaid = true;
  }

  const rawList = await db.expense.findMany({
    where,
    orderBy: { dueDate: "asc" },
  });

  let list = rawList.map(sanitizeExpense);

  if (filters?.status && filters.status !== "ALL") {
    list = list.filter((item) => item.status === filters.status);
  }

  return list;
}

/**
 * Fetches a single expense ensuring strict tenant companyId isolation.
 */
export async function getExpenseById(
  companyId: string,
  expenseId: string
): Promise<ExpenseRecord | null> {
  if (!companyId || !expenseId) {
    return null;
  }

  const raw = await db.expense.findFirst({
    where: {
      id: expenseId,
      companyId,
    },
  });

  if (!raw) {
    return null;
  }

  return sanitizeExpense(raw);
}

/**
 * Updates an unpaid expense. Throws if the expense is already paid or belongs to another tenant.
 */
export async function updateExpense(
  companyId: string,
  expenseIdOrInput: string | UpdateExpenseInput,
  maybeInput?: UpdateExpenseInput
): Promise<ExpenseRecord> {
  if (!companyId) {
    throw new Error("Tenant companyId is required.");
  }

  const expenseId =
    typeof expenseIdOrInput === "string" ? expenseIdOrInput : expenseIdOrInput.id;
  const input =
    typeof expenseIdOrInput === "string" ? maybeInput || {} : expenseIdOrInput;

  if (!expenseId) {
    throw new Error("Expense ID is required for update.");
  }

  const validated = updateExpenseSchema.parse(input);

  const existing = await db.expense.findFirst({
    where: { id: expenseId, companyId },
  });

  if (!existing) {
    throw new Error("Expense not found.");
  }

  if (existing.isPaid) {
    throw new Error("Cannot update an expense that has already been marked as paid.");
  }

  const updateData: Prisma.ExpenseUpdateInput = {};
  if (validated.title !== undefined) updateData.title = validated.title;
  if (validated.category !== undefined) updateData.category = validated.category;
  if (validated.amount !== undefined) updateData.amount = new Prisma.Decimal(validated.amount);
  if (validated.dueDate !== undefined) updateData.dueDate = validated.dueDate;
  if (validated.recurrence !== undefined) updateData.recurrence = validated.recurrence;
  if (validated.notes !== undefined) updateData.notes = validated.notes;

  const updated = await db.expense.update({
    where: { id: expenseId },
    data: updateData,
  });

  return sanitizeExpense(updated);
}

/**
 * Deletes an unpaid expense. Strictly forbids deletion of paid expenses to preserve ledger integrity.
 */
export async function deleteExpense(
  companyId: string,
  expenseId: string
): Promise<{ success: boolean; id: string }> {
  if (!companyId || !expenseId) {
    throw new Error("Tenant companyId and expenseId are required.");
  }

  const existing = await db.expense.findFirst({
    where: { id: expenseId, companyId },
  });

  if (!existing) {
    throw new Error("Expense not found.");
  }

  if (existing.isPaid) {
    throw new Error("Cannot delete an expense that has already been marked as paid.");
  }

  await db.expense.delete({
    where: { id: expenseId },
  });

  return { success: true, id: expenseId };
}

export type MarkExpensePaidResult = ExpenseRecord & {
  expense: ExpenseRecord;
  nextExpense: ExpenseRecord | null;
  transactionId: string;
};

/**
 * Atomically marks an expense as paid within a Neon database transaction:
 * 1. Sets isPaid = true and paidAt = paymentDate
 * 2. Creates a double-entry OUTFLOW Transaction in transactions table
 * 3. Creates an immutable AuditLog row (entityType='EXPENSE', action='PAID')
 * 4. If recurrence !== 'NONE', auto-advances dueDate by 1 cycle and creates the next scheduled unpaid expense
 */
export async function markExpenseAsPaid(
  companyId: string,
  expenseId: string,
  paymentData?: MarkExpensePaidInput,
  userId?: string | null
): Promise<MarkExpensePaidResult> {
  if (!companyId || !expenseId) {
    throw new Error("Tenant companyId and expenseId are required.");
  }

  const validated = paymentData ? markExpensePaidSchema.parse(paymentData) : {};
  const paymentDate = validated.paymentDate ? new Date(validated.paymentDate) : new Date();
  const paymentMethod = validated.paymentMethod || "BANK_TRANSFER";

  return await db.$transaction(
    async (tx) => {
      const existing = await tx.expense.findFirst({
        where: { id: expenseId, companyId },
      });

      if (!existing) {
        throw new Error("Expense not found.");
      }

      if (existing.isPaid) {
        throw new Error("Expense is already marked as paid.");
      }

      const reference =
        validated.reference?.trim() || `Expense payment: ${existing.title}`;

      // 1. Mark expense as paid
      const updated = await tx.expense.update({
        where: { id: existing.id },
        data: {
          isPaid: true,
          paidAt: paymentDate,
        },
      });

      // 2. Create double-entry OUTFLOW transaction
      const transaction = await tx.transaction.create({
        data: {
          companyId,
          type: "OUTFLOW",
          amount: existing.amount,
          baseAmount: existing.amount,
          transactionDate: paymentDate,
          category: existing.category,
          paymentMethod,
          reference,
        },
      });

      // 3. Create AuditLog entry
      await tx.auditLog.create({
        data: {
          companyId,
          userId: userId || null,
          entityType: "EXPENSE",
          entityId: existing.id,
          action: "PAID",
          details: JSON.stringify({
            title: existing.title,
            amount: Number(existing.amount),
            category: existing.category,
            recurrence: existing.recurrence,
            paymentDate: paymentDate.toISOString(),
            paymentMethod,
            reference,
            transactionId: transaction.id,
          }),
        },
      });

      // 4. Auto-advance recurrence if recurring
      let nextExpenseRecord: ExpenseRecord | null = null;
      if (existing.recurrence && existing.recurrence !== "NONE") {
        const nextDueDate = computeNextRecurringDate(
          existing.dueDate,
          existing.recurrence as ExpenseRecurrence
        );

        const nextRaw = await tx.expense.create({
          data: {
            companyId,
            title: existing.title,
            category: existing.category,
            amount: existing.amount,
            dueDate: nextDueDate,
            recurrence: existing.recurrence,
            isPaid: false,
            paidAt: null,
            notes: existing.notes,
          },
        });

        nextExpenseRecord = sanitizeExpense(nextRaw);
      }

      const sanitizedUpdated = sanitizeExpense(updated);
      return Object.assign(sanitizedUpdated, {
        expense: sanitizedUpdated,
        nextExpense: nextExpenseRecord,
        transactionId: transaction.id,
      });
    },
    { maxWait: 15000, timeout: 30000 }
  );
}

/**
 * Computes forward-looking expenditure intelligence and burn KPIs:
 * - totalScheduled / totalScheduledAmount: total unpaid scheduled liabilities
 * - scheduledAmount: total future unpaid scheduled liabilities (dueDate >= now)
 * - overdueAmount: total unpaid overdue liabilities (dueDate < now)
 * - next30DaysOutflow: scheduled liabilities maturing within 30 days
 * - monthlyRecurringBurn: normalized monthly recurring burn rate
 * - categoryBreakdown: expenditure breakdown across all categories
 * - counts: total, scheduled, overdue, and paid counts
 */
export async function getExpenseKPIs(companyId: string): Promise<ExpenseKPIs> {
  if (!companyId) {
    throw new Error("Tenant companyId is required.");
  }

  const expenses = await db.expense.findMany({
    where: { companyId },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const categoryBreakdown: Record<ExpenseCategory, number> = {
    PAYROLL: 0,
    RENT: 0,
    UTILITIES: 0,
    SUPPLIERS: 0,
    SOFTWARE: 0,
    TAX: 0,
    OTHER: 0,
  };

  const counts = {
    total: expenses.length,
    scheduled: 0,
    overdue: 0,
    paid: 0,
  };

  let totalScheduled = 0;
  let scheduledAmount = 0;
  let overdueAmount = 0;
  let next30DaysOutflow = 0;
  let monthlyRecurringBurn = 0;

  for (const expense of expenses) {
    const amount = Number(expense.amount) || 0;
    const cat = expense.category as ExpenseCategory;

    if (cat in categoryBreakdown) {
      categoryBreakdown[cat] = Math.round((categoryBreakdown[cat] + amount) * 100) / 100;
    } else {
      categoryBreakdown.OTHER = Math.round((categoryBreakdown.OTHER + amount) * 100) / 100;
    }

    if (expense.isPaid) {
      counts.paid++;
      continue;
    }

    const dueTime = new Date(expense.dueDate).getTime();
    const isOverdue = dueTime < now.getTime();

    totalScheduled = Math.round((totalScheduled + amount) * 100) / 100;

    if (isOverdue) {
      counts.overdue++;
      overdueAmount = Math.round((overdueAmount + amount) * 100) / 100;
    } else {
      counts.scheduled++;
      scheduledAmount = Math.round((scheduledAmount + amount) * 100) / 100;

      if (dueTime <= in30Days.getTime()) {
        next30DaysOutflow = Math.round((next30DaysOutflow + amount) * 100) / 100;
      }
    }

    if (expense.recurrence && expense.recurrence !== "NONE") {
      const burn = normalizeMonthlyBurn(amount, expense.recurrence as ExpenseRecurrence);
      monthlyRecurringBurn = Math.round((monthlyRecurringBurn + burn) * 100) / 100;
    }
  }

  return {
    totalScheduled,
    totalScheduledAmount: totalScheduled,
    scheduledAmount,
    overdueAmount,
    next30DaysOutflow,
    monthlyRecurringBurn,
    categoryBreakdown,
    counts,
  };
}

/**
 * Multi-tenant tagged cache: getCachedExpenses
 */
export async function getCachedExpenses(
  companyId: string,
  filters?: ExpenseFilters
): Promise<ExpenseRecord[]> {
  const filterKey = JSON.stringify(filters || {});
  return unstable_cache(
    async () => getExpenses(companyId, filters),
    [`expenses-${companyId}`, filterKey],
    {
      tags: [`expenses-${companyId}`],
      revalidate: 3600,
    }
  )();
}

/**
 * Multi-tenant tagged cache: getCachedExpenseById
 */
export async function getCachedExpenseById(
  companyId: string,
  expenseId: string
): Promise<ExpenseRecord | null> {
  return unstable_cache(
    async () => getExpenseById(companyId, expenseId),
    [`expense-${companyId}-${expenseId}`],
    {
      tags: [`expenses-${companyId}`, `expense-${companyId}-${expenseId}`],
      revalidate: 3600,
    }
  )();
}

/**
 * Multi-tenant tagged cache: getCachedExpenseKPIs
 */
export async function getCachedExpenseKPIs(companyId: string): Promise<ExpenseKPIs> {
  return unstable_cache(
    async () => getExpenseKPIs(companyId),
    [`expense-kpis-${companyId}`],
    {
      tags: [`expenses-${companyId}`, `kpis-${companyId}`],
      revalidate: 3600,
    }
  )();
}

/**
 * Bulk imports up to 500 scheduled/recurring expense rows atomically with audit logging.
 */
export async function bulkImportExpenses(
  companyId: string,
  rows: BulkExpenseRowInput[],
  userId?: string
): Promise<BulkImportExpensesResult> {
  if (!companyId) {
    throw new Error("Tenant companyId is required.");
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("At least one expense row is required for import.");
  }
  if (rows.length > 500) {
    throw new Error("Maximum 500 expense rows allowed per import.");
  }

  const errors: BulkExpenseRowFeedback[] = [];
  const validRows: Array<{
    title: string;
    category: ExpenseCategory;
    amount: number;
    dueDate: Date;
    recurrence: ExpenseRecurrence;
    notes: string | null;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNumber = raw.rowNumber ?? i + 1;
    const parsed = bulkExpenseRowSchema.safeParse({
      title: raw.title,
      category: raw.category,
      amount: raw.amount,
      dueDate: raw.dueDate,
      recurrence: raw.recurrence,
      notes: raw.notes,
    });

    if (!parsed.success) {
      errors.push({
        rowNumber,
        title: raw.title,
        message: parsed.error.issues.map((iss) => iss.message).join("; "),
      });
      continue;
    }

    validRows.push({
      title: parsed.data.title,
      category: parsed.data.category,
      amount: parsed.data.amount,
      dueDate: parsed.data.dueDate,
      recurrence: parsed.data.recurrence,
      notes: parsed.data.notes ? parsed.data.notes : null,
    });
  }

  let createdExpenses: ExpenseRecord[] = [];
  if (validRows.length > 0) {
    createdExpenses = await db.$transaction(
      async (tx) => {
        const created: ExpenseRecord[] = [];
        for (const item of validRows) {
          const row = await tx.expense.create({
            data: {
              companyId,
              title: item.title,
              category: item.category,
              amount: new Prisma.Decimal(item.amount),
              dueDate: item.dueDate,
              recurrence: item.recurrence,
              isPaid: false,
              paidAt: null,
              notes: item.notes,
            },
          });
          created.push(sanitizeExpense(row));
        }

        await tx.auditLog.create({
          data: {
            companyId,
            userId: userId || null,
            entityType: "EXPENSE",
            entityId: created[0]?.id || companyId,
            action: "CREATE",
            details: JSON.stringify({
              source: "CSV_BULK_IMPORT",
              createdCount: created.length,
              failedCount: errors.length,
            }),
          },
        });

        return created;
      },
      { maxWait: 15000, timeout: 45000 }
    );
  }

  return {
    createdCount: createdExpenses.length,
    failedCount: errors.length,
    createdExpenses,
    errors,
  };
}
