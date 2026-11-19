import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "@/lib/db";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_RECURRENCES,
  EXPENSE_STATUSES,
  createExpenseSchema,
  updateExpenseSchema,
  markExpensePaidSchema,
  expenseFilterSchema,
  resolveExpenseStatus,
  computeNextRecurringDate,
  normalizeMonthlyBurn,
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  markExpenseAsPaid,
  getExpenseKPIs,
} from "@/modules/expenses";
import type { ExpenseCategory, ExpenseRecurrence } from "@/modules/expenses";

describe("Domain 5: Expense Management & Scheduled Outflows", () => {
  const cleanupCompanyIds: string[] = [];
  let companyAId: string;
  let companyBId: string;

  beforeAll(async () => {
    // Warm up serverless Neon connection
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await db.$queryRaw`SELECT 1`;
        break;
      } catch (e) {
        if (attempt === 4) throw e;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // 1. Create Tenant A (Acme Industrial)
    const compA = await db.company.create({
      data: {
        name: "Acme Industrial Logistics Ltd",
        baseCurrency: "PKR",
      },
    });
    companyAId = compA.id;
    cleanupCompanyIds.push(compA.id);

    // 2. Create Tenant B (Zenith Global Corp - Isolated Tenant)
    const compB = await db.company.create({
      data: {
        name: "Zenith Global Corp",
        baseCurrency: "USD",
      },
    });
    companyBId = compB.id;
    cleanupCompanyIds.push(compB.id);
  }, 35000);

  afterAll(async () => {
    for (const compId of cleanupCompanyIds) {
      try {
        await db.company.delete({ where: { id: compId } });
      } catch {
        // Ignored if already cleaned
      }
    }
  }, 35000);

  // =========================================================================
  // 1. Zod Validation Contracts & Input Invariants
  // =========================================================================
  describe("Zod Validation Schemas & Input Invariants", () => {
    it("should accept valid expense input with minimal required fields", () => {
      const valid = createExpenseSchema.parse({
        title: "AWS Cloud Infrastructure",
        category: "SOFTWARE",
        amount: "1500.50",
        dueDate: "2026-12-01",
      });

      expect(valid.title).toBe("AWS Cloud Infrastructure");
      expect(valid.category).toBe("SOFTWARE");
      expect(valid.amount).toBe(1500.5);
      expect(valid.recurrence).toBe("NONE");
      expect(valid.dueDate).toBeInstanceOf(Date);
    });

    it("should reject title shorter than 2 characters", () => {
      const result = createExpenseSchema.safeParse({
        title: "A",
        category: "SOFTWARE",
        amount: 500,
        dueDate: "2026-12-01",
      });
      expect(result.success).toBe(false);
    });

    it("should reject title exceeding 120 characters", () => {
      const result = createExpenseSchema.safeParse({
        title: "X".repeat(121),
        category: "RENT",
        amount: 2500,
        dueDate: "2026-12-01",
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative expense amounts", () => {
      const result = createExpenseSchema.safeParse({
        title: "Office Supplies",
        category: "SUPPLIERS",
        amount: -150,
        dueDate: "2026-12-01",
      });
      expect(result.success).toBe(false);
    });

    it("should reject zero expense amount (must be positive)", () => {
      const result = createExpenseSchema.safeParse({
        title: "Office Supplies",
        category: "SUPPLIERS",
        amount: 0,
        dueDate: "2026-12-01",
      });
      expect(result.success).toBe(false);
    });

    it("should reject amount exceeding maximum threshold (10 Billion)", () => {
      const result = createExpenseSchema.safeParse({
        title: "Gigantic Asset Acquisition",
        category: "OTHER",
        amount: 10_000_000_001,
        dueDate: "2026-12-01",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid category not in predefined enum", () => {
      const result = createExpenseSchema.safeParse({
        title: "Lunch Catering",
        category: "FOOD_AND_BEVERAGES", // invalid
        amount: 300,
        dueDate: "2026-12-01",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid recurrence not in predefined enum", () => {
      const result = createExpenseSchema.safeParse({
        title: "Maintenance Contract",
        category: "UTILITIES",
        amount: 600,
        dueDate: "2026-12-01",
        recurrence: "BIWEEKLY", // invalid
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid due date format", () => {
      const result = createExpenseSchema.safeParse({
        title: "Tax Filing",
        category: "TAX",
        amount: 1200,
        dueDate: "invalid-date-string",
      });
      expect(result.success).toBe(false);
    });

    it("should trim strings and safely handle optional notes", () => {
      const valid = createExpenseSchema.parse({
        title: "   Monthly Office Rent   ",
        category: "RENT",
        amount: 45000,
        dueDate: "2026-12-01",
        notes: "   Floor 4 Lease settlement   ",
      });

      expect(valid.title).toBe("Monthly Office Rent");
      expect(valid.notes).toBe("Floor 4 Lease settlement");
    });

    it("should reject notes exceeding 500 characters", () => {
      const result = createExpenseSchema.safeParse({
        title: "Legal Retainer",
        category: "OTHER",
        amount: 5000,
        dueDate: "2026-12-01",
        notes: "A".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("should accept partial fields in updateExpenseSchema", () => {
      const valid = updateExpenseSchema.parse({
        amount: 7500,
        notes: "Revised quote",
      });
      expect(valid.amount).toBe(7500);
      expect(valid.notes).toBe("Revised quote");
      expect(valid.title).toBeUndefined();
    });

    it("should reject invalid negative amount in updateExpenseSchema", () => {
      const result = updateExpenseSchema.safeParse({
        amount: -50,
      });
      expect(result.success).toBe(false);
    });

    it("should parse markExpensePaidSchema with defaults", () => {
      const valid = markExpensePaidSchema.parse({});
      expect(valid.paymentMethod).toBe("BANK_TRANSFER");
      expect(valid.paymentDate).toBeUndefined();
    });

    it("should accept explicit paymentDate and reference in markExpensePaidSchema", () => {
      const valid = markExpensePaidSchema.parse({
        paymentDate: "2026-11-19T10:00:00Z",
        paymentMethod: "WIRE",
        reference: "WT-2026-9901",
      });
      expect(valid.paymentMethod).toBe("WIRE");
      expect(valid.reference).toBe("WT-2026-9901");
      expect(valid.paymentDate).toBeInstanceOf(Date);
    });

    it("should reject reference exceeding 255 characters", () => {
      const result = markExpensePaidSchema.safeParse({
        reference: "R".repeat(256),
      });
      expect(result.success).toBe(false);
    });

    it("should parse expenseFilterSchema with ALL defaults", () => {
      const filters = expenseFilterSchema.parse({});
      expect(filters.status).toBe("ALL");
      expect(filters.category).toBe("ALL");
      expect(filters.recurrence).toBe("ALL");
    });
  });

  // =========================================================================
  // 2. Pure Helper Functions & Mathematical Precision
  // =========================================================================
  describe("Pure Business Logic & Mathematical Precision", () => {
    it("should resolve status as PAID when isPaid is true regardless of date", () => {
      const pastPaid = resolveExpenseStatus({
        isPaid: true,
        dueDate: new Date(Date.now() - 86400000 * 30),
      });
      expect(pastPaid).toBe("PAID");

      const futurePaid = resolveExpenseStatus({
        isPaid: true,
        dueDate: new Date(Date.now() + 86400000 * 30),
      });
      expect(futurePaid).toBe("PAID");
    });

    it("should resolve status as OVERDUE when isPaid is false and dueDate is in the past", () => {
      const overdue = resolveExpenseStatus({
        isPaid: false,
        dueDate: new Date(Date.now() - 10000), // 10 seconds ago
      });
      expect(overdue).toBe("OVERDUE");
    });

    it("should resolve status as SCHEDULED when isPaid is false and dueDate is in the future", () => {
      const scheduled = resolveExpenseStatus({
        isPaid: false,
        dueDate: new Date(Date.now() + 86400000 * 7), // 7 days from now
      });
      expect(scheduled).toBe("SCHEDULED");
    });

    it("should advance WEEKLY recurrence by exactly 7 days", () => {
      const base = new Date("2026-11-10T12:00:00Z");
      const next = computeNextRecurringDate(base, "WEEKLY");
      expect(next.toISOString().startsWith("2026-11-17")).toBe(true);
    });

    it("should advance MONTHLY recurrence with month-end safety (Jan 31 -> Feb 28)", () => {
      const jan31 = new Date("2026-01-31T12:00:00Z");
      const next = computeNextRecurringDate(jan31, "MONTHLY");
      // February 2026 has 28 days
      expect(next.getUTCMonth()).toBe(1); // 0-indexed Feb is 1
      expect(next.getUTCDate()).toBe(28);
    });

    it("should advance QUARTERLY recurrence by exactly 3 calendar months", () => {
      const march = new Date("2026-03-15T12:00:00Z");
      const next = computeNextRecurringDate(march, "QUARTERLY");
      expect(next.getUTCMonth()).toBe(5); // June is 5
      expect(next.getUTCDate()).toBe(15);
    });

    it("should advance ANNUALLY recurrence by exactly 1 calendar year", () => {
      const date2026 = new Date("2026-05-20T12:00:00Z");
      const next = computeNextRecurringDate(date2026, "ANNUALLY");
      expect(next.getUTCFullYear()).toBe(2027);
      expect(next.getUTCMonth()).toBe(4);
      expect(next.getUTCDate()).toBe(20);
    });

    it("should return unchanged date when recurrence is NONE", () => {
      const date = new Date("2026-09-01T12:00:00Z");
      const next = computeNextRecurringDate(date, "NONE");
      expect(next.getTime()).toBe(date.getTime());
    });

    it("should normalize WEEKLY recurrence to monthly burn ((amount * 52) / 12)", () => {
      // 1,200 * 52 / 12 = 5,200
      const burn = normalizeMonthlyBurn(1200, "WEEKLY");
      expect(burn).toBe(5200);
    });

    it("should normalize MONTHLY recurrence to monthly burn (1x amount)", () => {
      const burn = normalizeMonthlyBurn(35000, "MONTHLY");
      expect(burn).toBe(35000);
    });

    it("should normalize QUARTERLY recurrence to monthly burn (amount / 3)", () => {
      // 9,000 / 3 = 3,000
      const burn = normalizeMonthlyBurn(9000, "QUARTERLY");
      expect(burn).toBe(3000);
    });

    it("should normalize ANNUALLY recurrence to monthly burn (amount / 12)", () => {
      // 24,000 / 12 = 2,000
      const burn = normalizeMonthlyBurn(24000, "ANNUALLY");
      expect(burn).toBe(2000);
    });

    it("should return 0 monthly burn for non-recurring expenses (NONE)", () => {
      const burn = normalizeMonthlyBurn(50000, "NONE");
      expect(burn).toBe(0);
    });
  });

  // =========================================================================
  // 3. Multi-Tenant Database Isolation & CRUD Operations (Integration)
  // =========================================================================
  describe("Multi-Tenant CRUD & Boundary Isolation", () => {
    let companyAExpenseId: string;
    let companyBExpenseId: string;

    it("should create an expense under Company A with Decimal precision", async () => {
      const exp = await createExpense(companyAId, {
        title: "Office Fiber Internet",
        category: "UTILITIES",
        amount: 8500.5,
        dueDate: new Date(Date.now() + 86400000 * 14),
        recurrence: "MONTHLY",
        notes: "High-speed symmetric line",
      });

      expect(exp.id).toBeDefined();
      expect(exp.companyId).toBe(companyAId);
      expect(exp.title).toBe("Office Fiber Internet");
      expect(exp.amount).toBe(8500.5);
      expect(exp.category).toBe("UTILITIES");
      expect(exp.recurrence).toBe("MONTHLY");
      expect(exp.isPaid).toBe(false);
      expect(exp.status).toBe("SCHEDULED");

      companyAExpenseId = exp.id;
    }, 15000);

    it("should create an expense under Company B in complete isolation", async () => {
      const exp = await createExpense(companyBId, {
        title: "Enterprise Server Fleet",
        category: "SOFTWARE",
        amount: 4500,
        dueDate: new Date(Date.now() + 86400000 * 5),
        recurrence: "ANNUALLY",
      });

      expect(exp.id).toBeDefined();
      expect(exp.companyId).toBe(companyBId);
      companyBExpenseId = exp.id;
    }, 15000);

    it("should isolate getExpenses: Company B cannot see Company A's expenses", async () => {
      const listA = await getExpenses(companyAId);
      const listB = await getExpenses(companyBId);

      expect(listA.some((e) => e.id === companyAExpenseId)).toBe(true);
      expect(listA.some((e) => e.id === companyBExpenseId)).toBe(false);

      expect(listB.some((e) => e.id === companyBExpenseId)).toBe(true);
      expect(listB.some((e) => e.id === companyAExpenseId)).toBe(false);
    }, 15000);

    it("should prevent cross-tenant getExpenseById: returns null when Company B queries Company A's expense", async () => {
      const result = await getExpenseById(companyBId, companyAExpenseId);
      expect(result).toBeNull();
    }, 15000);

    it("should allow Company A to update their own unpaid expense", async () => {
      const updated = await updateExpense(companyAId, companyAExpenseId, {
        title: "Dedicated Gigabit Fiber",
        amount: 9200,
        notes: "Upgraded bandwidth tier",
      });

      expect(updated.title).toBe("Dedicated Gigabit Fiber");
      expect(updated.amount).toBe(9200);
      expect(updated.notes).toBe("Upgraded bandwidth tier");
    }, 15000);

    it("should reject cross-tenant update: Company B cannot update Company A's expense", async () => {
      await expect(
        updateExpense(companyBId, companyAExpenseId, {
          title: "Malicious Tampering",
        })
      ).rejects.toThrow("Expense not found.");
    }, 15000);

    it("should reject cross-tenant delete: Company B cannot delete Company A's expense", async () => {
      await expect(deleteExpense(companyBId, companyAExpenseId)).rejects.toThrow(
        "Expense not found."
      );
    }, 15000);

    it("should filter expenses by category", async () => {
      const utilities = await getExpenses(companyAId, { category: "UTILITIES" });
      const payroll = await getExpenses(companyAId, { category: "PAYROLL" });

      expect(utilities.some((e) => e.id === companyAExpenseId)).toBe(true);
      expect(payroll.some((e) => e.id === companyAExpenseId)).toBe(false);
    }, 15000);

    it("should filter expenses by recurrence", async () => {
      const monthly = await getExpenses(companyAId, { recurrence: "MONTHLY" });
      const annual = await getExpenses(companyAId, { recurrence: "ANNUALLY" });

      expect(monthly.some((e) => e.id === companyAExpenseId)).toBe(true);
      expect(annual.some((e) => e.id === companyAExpenseId)).toBe(false);
    }, 15000);

    it("should search expenses by title and notes keyword", async () => {
      const matched = await getExpenses(companyAId, { search: "Gigabit" });
      const unmatched = await getExpenses(companyAId, { search: "NonExistentKeywordXYZ" });

      expect(matched.some((e) => e.id === companyAExpenseId)).toBe(true);
      expect(unmatched.length).toBe(0);
    }, 15000);

    it("should allow Company A to delete an unpaid expense", async () => {
      const tempExp = await createExpense(companyAId, {
        title: "Disposable Temp Expense",
        category: "OTHER",
        amount: 250,
        dueDate: new Date(),
      });

      const delResult = await deleteExpense(companyAId, tempExp.id);
      expect(delResult.success).toBe(true);

      const check = await getExpenseById(companyAId, tempExp.id);
      expect(check).toBeNull();
    }, 15000);
  });

  // =========================================================================
  // 4. ACID Transaction Integrity on markExpenseAsPaid
  // =========================================================================
  describe("ACID Transaction Integrity on markExpenseAsPaid", () => {
    let oneOffExpenseId: string;
    let paymentTxId: string;

    beforeAll(async () => {
      const exp = await createExpense(companyAId, {
        title: "Annual Legal Audit Fee",
        category: "OTHER",
        amount: 75000,
        dueDate: new Date(Date.now() + 86400000 * 2),
        recurrence: "NONE",
        notes: "Corporate compliance retainership",
      });
      oneOffExpenseId = exp.id;
    }, 15000);

    it("should atomically mark expense as paid and record OUTFLOW transaction and audit log", async () => {
      const paymentDate = new Date();
      const result = await markExpenseAsPaid(
        companyAId,
        oneOffExpenseId,
        {
          paymentDate,
          paymentMethod: "WIRE_TRANSFER",
          reference: "REF-LEGAL-75000",
        },
        "usr-audit-verifier"
      );

      expect(result.isPaid).toBe(true);
      expect(result.status).toBe("PAID");
      expect(result.paidAt).toBeDefined();
      expect(result.nextExpense).toBeNull(); // Non-recurring
      expect(result.transactionId).toBeDefined();

      paymentTxId = result.transactionId;

      // 1. Verify Expense in DB
      const verifiedExp = await db.expense.findUnique({
        where: { id: oneOffExpenseId },
      });
      expect(verifiedExp?.isPaid).toBe(true);
      expect(verifiedExp?.paidAt).toBeDefined();

      // 2. Verify double-entry OUTFLOW Transaction row in DB
      const verifiedTx = await db.transaction.findUnique({
        where: { id: paymentTxId },
      });
      expect(verifiedTx).toBeDefined();
      expect(verifiedTx?.companyId).toBe(companyAId);
      expect(verifiedTx?.type).toBe("OUTFLOW");
      expect(Number(verifiedTx?.amount)).toBe(75000);
      expect(Number(verifiedTx?.baseAmount)).toBe(75000);
      expect(verifiedTx?.category).toBe("OTHER");
      expect(verifiedTx?.paymentMethod).toBe("WIRE_TRANSFER");
      expect(verifiedTx?.reference).toBe("REF-LEGAL-75000");

      // 3. Verify immutable AuditLog row in DB
      const auditLog = await db.auditLog.findFirst({
        where: {
          companyId: companyAId,
          entityType: "EXPENSE",
          entityId: oneOffExpenseId,
          action: "PAID",
        },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.userId).toBe("usr-audit-verifier");
      expect(auditLog?.details).toContain("REF-LEGAL-75000");
      expect(auditLog?.details).toContain("75000");
    }, 25000);

    it("should prevent updating an expense that has already been paid", async () => {
      await expect(
        updateExpense(companyAId, oneOffExpenseId, {
          title: "Tampered Paid Expense",
          amount: 80000,
        })
      ).rejects.toThrow("Cannot update an expense that has already been marked as paid.");
    }, 15000);

    it("should prevent deleting an expense that has already been paid to maintain ledger integrity", async () => {
      await expect(deleteExpense(companyAId, oneOffExpenseId)).rejects.toThrow(
        "Cannot delete an expense that has already been marked as paid."
      );
    }, 15000);

    it("should reject marking an already-paid expense as paid again", async () => {
      await expect(
        markExpenseAsPaid(companyAId, oneOffExpenseId, {
          reference: "DUPLICATE_PAYMENT",
        })
      ).rejects.toThrow("Expense is already marked as paid.");
    }, 15000);

    it("should reject cross-tenant markExpenseAsPaid: Company B cannot mark Company A's expense as paid", async () => {
      const freshExp = await createExpense(companyAId, {
        title: "Supplier Inventory Batch #12",
        category: "SUPPLIERS",
        amount: 14000,
        dueDate: new Date(),
      });

      await expect(
        markExpenseAsPaid(companyBId, freshExp.id, {
          reference: "HACK_ATTEMPT",
        })
      ).rejects.toThrow("Expense not found.");
    }, 15000);
  });

  // =========================================================================
  // 5. Recurrence Auto-Advancement Integration
  // =========================================================================
  describe("Recurrence Auto-Advancement Lifecycle", () => {
    it("should auto-advance MONTHLY expense: create next cycle when paid", async () => {
      const initialDue = new Date("2026-10-15T10:00:00Z");
      const monthlyExp = await createExpense(companyAId, {
        title: "Office Cloud Hosting",
        category: "SOFTWARE",
        amount: 12000,
        dueDate: initialDue,
        recurrence: "MONTHLY",
        notes: "Core API cluster servers",
      });

      const result = await markExpenseAsPaid(companyAId, monthlyExp.id, {
        reference: "MONTHLY_OCT_2026",
      });

      expect(result.isPaid).toBe(true);
      expect(result.nextExpense).toBeDefined();
      expect(result.nextExpense).not.toBeNull();

      const next = result.nextExpense!;
      expect(next.title).toBe("Office Cloud Hosting");
      expect(next.amount).toBe(12000);
      expect(next.category).toBe("SOFTWARE");
      expect(next.recurrence).toBe("MONTHLY");
      expect(next.isPaid).toBe(false);
      expect(next.paidAt).toBeNull();
      expect(next.notes).toBe("Core API cluster servers");

      // Verify the next cycle dueDate is advanced by 1 month (Nov 15)
      const nextDue = new Date(next.dueDate);
      expect(nextDue.getUTCMonth()).toBe(10); // Nov is 10
      expect(nextDue.getUTCDate()).toBe(15);
    }, 25000);

    it("should auto-advance WEEKLY expense: advance by exactly 7 days", async () => {
      const weeklyDue = new Date("2026-11-02T09:00:00Z");
      const weeklyExp = await createExpense(companyAId, {
        title: "Weekly Office Sanitation",
        category: "UTILITIES",
        amount: 2500,
        dueDate: weeklyDue,
        recurrence: "WEEKLY",
      });

      const result = await markExpenseAsPaid(companyAId, weeklyExp.id);
      expect(result.nextExpense).toBeDefined();

      const nextDue = new Date(result.nextExpense!.dueDate);
      expect(nextDue.toISOString().startsWith("2026-11-09")).toBe(true);
    }, 25000);

    it("should auto-advance QUARTERLY expense: advance by 3 months", async () => {
      const qDue = new Date("2026-03-31T12:00:00Z");
      const qExp = await createExpense(companyAId, {
        title: "Quarterly Audit Retainer",
        category: "TAX",
        amount: 45000,
        dueDate: qDue,
        recurrence: "QUARTERLY",
      });

      const result = await markExpenseAsPaid(companyAId, qExp.id);
      expect(result.nextExpense).toBeDefined();

      const nextDue = new Date(result.nextExpense!.dueDate);
      // March 31 + 3 months -> June 30
      expect(nextDue.getUTCMonth()).toBe(5); // June is 5
      expect(nextDue.getUTCDate()).toBe(30);
    }, 25000);

    it("should auto-advance ANNUALLY expense: advance by 1 year", async () => {
      const annualDue = new Date("2026-07-01T00:00:00Z");
      const annualExp = await createExpense(companyAId, {
        title: "Domain & SSL Multi-Year Fleet",
        category: "SOFTWARE",
        amount: 18000,
        dueDate: annualDue,
        recurrence: "ANNUALLY",
      });

      const result = await markExpenseAsPaid(companyAId, annualExp.id);
      expect(result.nextExpense).toBeDefined();

      const nextDue = new Date(result.nextExpense!.dueDate);
      expect(nextDue.getUTCFullYear()).toBe(2027);
      expect(nextDue.getUTCMonth()).toBe(6); // July is 6
      expect(nextDue.getUTCDate()).toBe(1);
    }, 25000);
  });

  // =========================================================================
  // 6. Forward-Looking Expenditure Intelligence & KPI Calculations
  // =========================================================================
  describe("Forward-Looking Expenditure Intelligence & KPI Calculations", () => {
    let kpiTenantId: string;

    beforeAll(async () => {
      const kpiComp = await db.company.create({
        data: {
          name: "KPI Precision Analytics Corp",
          baseCurrency: "PKR",
        },
      });
      kpiTenantId = kpiComp.id;
      cleanupCompanyIds.push(kpiTenantId);

      const now = Date.now();

      // 1. Overdue expense (past due, unpaid): 10,000
      await createExpense(kpiTenantId, {
        title: "Past Rent Installment",
        category: "RENT",
        amount: 10000,
        dueDate: new Date(now - 86400000 * 5),
        recurrence: "NONE",
      });

      // 2. Scheduled within 30 days (unpaid): 20,000, Monthly recurring
      await createExpense(kpiTenantId, {
        title: "Next Week Payroll",
        category: "PAYROLL",
        amount: 20000,
        dueDate: new Date(now + 86400000 * 7),
        recurrence: "MONTHLY",
      });

      // 3. Scheduled beyond 30 days (unpaid): 30,000, Annually recurring
      await createExpense(kpiTenantId, {
        title: "Q3 Insurance Premium",
        category: "OTHER",
        amount: 36000,
        dueDate: new Date(now + 86400000 * 60),
        recurrence: "ANNUALLY", // 36,000 / 12 = 3,000/mo burn
      });

      // 4. Settled expense (isPaid = true): 50,000
      const paidExp = await createExpense(kpiTenantId, {
        title: "Settled Hardware Supplier",
        category: "SUPPLIERS",
        amount: 50000,
        dueDate: new Date(now - 86400000 * 2),
        recurrence: "NONE",
      });
      await markExpenseAsPaid(kpiTenantId, paidExp.id);
    }, 30000);

    it("should compute totalScheduled liabilities matching all unpaid expenses", async () => {
      const kpis = await getExpenseKPIs(kpiTenantId);
      // Unpaid: 10,000 + 20,000 + 36,000 = 66,000
      expect(kpis.totalScheduled).toBe(66000);
      expect(kpis.totalScheduledAmount).toBe(66000);
    }, 15000);

    it("should accurately isolate overdueAmount (past due liabilities)", async () => {
      const kpis = await getExpenseKPIs(kpiTenantId);
      expect(kpis.overdueAmount).toBe(10000);
    }, 15000);

    it("should accurately isolate scheduledAmount (future unpaid liabilities)", async () => {
      const kpis = await getExpenseKPIs(kpiTenantId);
      // Future unpaid: 20,000 + 36,000 = 56,000
      expect(kpis.scheduledAmount).toBe(56000);
    }, 15000);

    it("should accurately compute next30DaysOutflow (unpaid liabilities due within 30 days)", async () => {
      const kpis = await getExpenseKPIs(kpiTenantId);
      // Only the 20,000 is due in 7 days (within 30 days)
      expect(kpis.next30DaysOutflow).toBe(20000);
    }, 15000);

    it("should accurately compute monthlyRecurringBurn rate", async () => {
      const kpis = await getExpenseKPIs(kpiTenantId);
      // Active recurring:
      // Monthly 20,000 -> 20,000
      // Annually 36,000 -> 36,000 / 12 = 3,000
      // Total monthly burn = 23,000
      expect(kpis.monthlyRecurringBurn).toBe(23000);
    }, 15000);

    it("should accurately compute categoryBreakdown across all categories", async () => {
      const kpis = await getExpenseKPIs(kpiTenantId);
      expect(kpis.categoryBreakdown.RENT).toBe(10000);
      expect(kpis.categoryBreakdown.PAYROLL).toBe(20000);
      expect(kpis.categoryBreakdown.OTHER).toBe(36000);
      expect(kpis.categoryBreakdown.SUPPLIERS).toBe(50000);
      expect(kpis.categoryBreakdown.SOFTWARE).toBe(0);
      expect(kpis.categoryBreakdown.UTILITIES).toBe(0);
      expect(kpis.categoryBreakdown.TAX).toBe(0);
    }, 15000);

    it("should track accurate counts across lifecycle states", async () => {
      const kpis = await getExpenseKPIs(kpiTenantId);
      expect(kpis.counts.total).toBe(4);
      expect(kpis.counts.overdue).toBe(1);
      expect(kpis.counts.scheduled).toBe(2);
      expect(kpis.counts.paid).toBe(1);
    }, 15000);

    it("should maintain strict multi-tenant boundary for KPIs", async () => {
      const kpisB = await getExpenseKPIs(companyBId);
      // Company B has only 1 expense from earlier test (4,500)
      expect(kpisB.totalScheduled).toBe(4500);
      expect(kpisB.counts.total).toBe(1);
    }, 15000);
  });
});
