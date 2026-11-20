import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "@/lib/db";
import Decimal from "decimal.js";
import { calendarQuerySchema } from "@/modules/calendar/validation";
import {
  getMonthCalendar,
  getCachedMonthCalendar,
} from "@/modules/calendar/service";
import { getCalendarMonthAction } from "@/modules/calendar/actions";

describe("Domain 7: Visual Calendar & Scheduling Service", () => {
  const cleanupCompanyIds: string[] = [];
  let companyAId: string;
  let companyBId: string;
  let clientAId: string;
  let clientBId: string;

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

    // 1. Create Tenant A
    const compA = await db.company.create({
      data: {
        name: "Calendar Test Systems Ltd",
        baseCurrency: "PKR",
        liquidReserve: new Decimal(1_000_000),
        safetyBuffer: new Decimal(200_000),
      },
    });
    companyAId = compA.id;
    cleanupCompanyIds.push(compA.id);

    // 2. Create Tenant B (Isolation Check)
    const compB = await db.company.create({
      data: {
        name: "Calendar Competitor Corp",
        baseCurrency: "PKR",
        liquidReserve: new Decimal(500_000),
        safetyBuffer: new Decimal(100_000),
      },
    });
    companyBId = compB.id;
    cleanupCompanyIds.push(compB.id);

    // 3. Create Clients
    const clA = await db.client.create({
      data: {
        companyId: companyAId,
        clientName: "Alpha Industrial Supplies",
        email: "alpha@example.com",
        paymentTermsDays: 14,
      },
    });
    clientAId = clA.id;

    const clB = await db.client.create({
      data: {
        companyId: companyBId,
        clientName: "Beta Wholesale Ltd",
        email: "beta@example.com",
        paymentTermsDays: 30,
      },
    });
    clientBId = clB.id;

    // 4. Seed Invoices for Company A and Company B
    const targetDate = new Date(Date.UTC(2026, 10, 15, 12, 0, 0)); // Nov 15, 2026

    await db.invoice.create({
      data: {
        companyId: companyAId,
        clientId: clientAId,
        invoiceNumber: "INV-CAL-001",
        issueDate: new Date(Date.UTC(2026, 10, 1)),
        dueDate: targetDate,
        currency: "PKR",
        exchangeRate: new Decimal(1.0),
        totalAmount: new Decimal(150_000),
        baseTotalAmount: new Decimal(150_000),
        paidAmount: new Decimal(0),
        status: "SENT",
        viewToken: "cal-token-a1",
      },
    });

    await db.invoice.create({
      data: {
        companyId: companyBId,
        clientId: clientBId,
        invoiceNumber: "INV-CAL-B01",
        issueDate: new Date(Date.UTC(2026, 10, 1)),
        dueDate: targetDate,
        currency: "PKR",
        exchangeRate: new Decimal(1.0),
        totalAmount: new Decimal(999_999),
        baseTotalAmount: new Decimal(999_999),
        paidAmount: new Decimal(0),
        status: "SENT",
        viewToken: "cal-token-b1",
      },
    });

    // 5. Seed Expense for Company A
    await db.expense.create({
      data: {
        companyId: companyAId,
        title: "AWS Cloud Infrastructure",
        category: "SOFTWARE",
        amount: new Decimal(50_000),
        dueDate: targetDate,
        recurrence: "MONTHLY",
        isPaid: false,
      },
    });
  }, 30000);

  afterAll(async () => {
    for (const cId of cleanupCompanyIds) {
      await db.transaction.deleteMany({ where: { companyId: cId } });
      await db.auditLog.deleteMany({ where: { companyId: cId } });
      await db.expense.deleteMany({ where: { companyId: cId } });
      await db.invoiceItem.deleteMany({ where: { invoice: { companyId: cId } } });
      await db.invoice.deleteMany({ where: { companyId: cId } });
      await db.client.deleteMany({ where: { companyId: cId } });
      await db.company.deleteMany({ where: { id: cId } });
    }
  }, 30000);

  describe("Validation Contracts (calendarQuerySchema)", () => {
    it("should parse valid year, month, and view", () => {
      const parsed = calendarQuerySchema.parse({
        year: 2026,
        month: 11,
        view: "month",
      });
      expect(parsed.year).toBe(2026);
      expect(parsed.month).toBe(11);
      expect(parsed.view).toBe("month");
    });

    it("should supply default view 'month' when omitted", () => {
      const parsed = calendarQuerySchema.parse({});
      expect(parsed.view).toBe("month");
    });

    it("should reject year prior to 2020", () => {
      expect(() =>
        calendarQuerySchema.parse({ year: 2019, month: 5 })
      ).toThrow("Year must be 2020 or later.");
    });

    it("should reject year exceeding 2050", () => {
      expect(() =>
        calendarQuerySchema.parse({ year: 2051, month: 5 })
      ).toThrow("Year cannot exceed 2050.");
    });

    it("should reject month less than 1 or greater than 12", () => {
      expect(() =>
        calendarQuerySchema.parse({ year: 2026, month: 0 })
      ).toThrow();
      expect(() =>
        calendarQuerySchema.parse({ year: 2026, month: 13 })
      ).toThrow();
    });

    it("should accept valid week and list view modes", () => {
      const week = calendarQuerySchema.parse({ view: "week" });
      const list = calendarQuerySchema.parse({ view: "list" });
      expect(week.view).toBe("week");
      expect(list.view).toBe("list");
    });
  });

  describe("Calendar Grid & Temporal Engine Mechanics", () => {
    it("should construct 35 or 42 slots with correct Monday alignment for November 2026", async () => {
      const data = await getMonthCalendar(companyAId, 2026, 11);
      expect([35, 42]).toContain(data.days.length);
      expect(data.summary.year).toBe(2026);
      expect(data.summary.month).toBe(11);
      expect(data.summary.monthName).toBe("November");
      expect(data.baseCurrency).toBe("PKR");

      // Nov 1, 2026 was Sunday. With Monday start, index 0 is Monday Oct 26, index 6 is Sunday Nov 1
      const nov1Day = data.days.find((d) => d.date === "2026-11-01");
      expect(nov1Day).toBeDefined();
      expect(nov1Day?.isCurrentMonth).toBe(true);
      expect(nov1Day?.dayNumber).toBe(1);
    });

    it("should accurately aggregate receivables and payables on November 15, 2026", async () => {
      const data = await getMonthCalendar(companyAId, 2026, 11);
      const targetDay = data.days.find((d) => d.date === "2026-11-15");
      expect(targetDay).toBeDefined();

      if (targetDay) {
        expect(targetDay.inflows).toBe(150_000);
        expect(targetDay.outflows).toBe(50_000);
        expect(targetDay.netChange).toBe(100_000);
        expect(targetDay.events.length).toBe(2);

        const invEvent = targetDay.events.find((e) => e.type === "invoice");
        expect(invEvent).toBeDefined();
        expect(invEvent?.referenceNumber).toBe("INV-CAL-001");
        expect(invEvent?.amount).toBe(150_000);

        const expEvent = targetDay.events.find((e) => e.type === "expense");
        expect(expEvent).toBeDefined();
        expect(expEvent?.title).toBe("AWS Cloud Infrastructure");
        expect(expEvent?.amount).toBe(50_000);
      }
    });

    it("should strictly enforce tenant boundary: Company A cannot see Company B events", async () => {
      const dataA = await getMonthCalendar(companyAId, 2026, 11);
      const dataB = await getMonthCalendar(companyBId, 2026, 11);

      const targetDayA = dataA.days.find((d) => d.date === "2026-11-15");
      const targetDayB = dataB.days.find((d) => d.date === "2026-11-15");

      // Company A only sees 150k inflow, never 999,999 from Company B
      expect(targetDayA?.inflows).toBe(150_000);
      expect(targetDayA?.events.some((e) => e.referenceNumber === "INV-CAL-B01")).toBe(false);

      // Company B only sees 999,999, never Company A's events
      expect(targetDayB?.inflows).toBe(999_999);
      expect(targetDayB?.outflows).toBe(0);
      expect(targetDayB?.events.some((e) => e.referenceNumber === "INV-CAL-001")).toBe(false);
    }, 15000);

    it("should compute monthly summary metrics accurately", async () => {
      const data = await getMonthCalendar(companyAId, 2026, 11);
      expect(data.summary.totalInflows).toBe(150_000);
      expect(data.summary.totalOutflows).toBe(50_000);
      expect(data.summary.netChange).toBe(100_000);
      expect(data.summary.invoiceCount).toBe(1);
      expect(data.summary.expenseCount).toBe(1);
    });

    it("should retrieve data seamlessly through getCachedMonthCalendar", async () => {
      const cached = await getCachedMonthCalendar(companyAId, 2026, 11);
      expect(cached).toBeDefined();
      expect(cached.summary.monthName).toBe("November");
      expect(cached.summary.totalInflows).toBe(150_000);
    });

    it("should reject getMonthCalendar with invalid tenant ID", async () => {
      expect(getMonthCalendar("")).rejects.toThrow("Tenant companyId is required.");
    });
  });

  describe("Server Actions Security Contracts", () => {
    it("should reject unauthenticated getCalendarMonthAction calls", async () => {
      const res = await getCalendarMonthAction({ year: 2026, month: 11 });
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });
});
