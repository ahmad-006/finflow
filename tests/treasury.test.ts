import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "@/lib/db";
import Decimal from "decimal.js";
import {
  updateTreasurySettingsSchema,
  forecastQuerySchema,
} from "@/modules/treasury/validation";
import {
  roundMoney,
  toUtcMidnight,
  buildForecastTrajectory,
  get30DayForecast,
  getTreasurySettings,
  updateTreasurySettings,
  getCached30DayForecast,
  computeClientLatencies,
  getDayForecastDetails,
  getCachedDayForecastDetails,
} from "@/modules/treasury/service";
import {
  updateTreasurySettingsAction,
  getForecastAction,
} from "@/modules/treasury/actions";
import type {
  UnpaidInvoiceDTO,
  UnpaidExpenseDTO,
} from "@/modules/treasury/types";

describe("Domain 6: Treasury Ledger & 30-Day Forward Forecast Engine", () => {
  const cleanupCompanyIds: string[] = [];
  let companyAId: string;
  let companyBId: string;
  let clientAId: string;

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

    // 1. Create Tenant A (Base Currency: PKR, initial reserves)
    const compA = await db.company.create({
      data: {
        name: "Indus Logistics Systems (Pvt) Ltd",
        baseCurrency: "PKR",
        liquidReserve: new Decimal(2_500_000),
        safetyBuffer: new Decimal(1_000_000),
      },
    });
    companyAId = compA.id;
    cleanupCompanyIds.push(compA.id);

    const clientA = await db.client.create({
      data: {
        companyId: companyAId,
        clientName: "Karachi Port Shipping Hub",
        email: "accounts@karachiport.example",
        paymentTermsDays: 30,
      },
    });
    clientAId = clientA.id;

    // 2. Create Tenant B (Base Currency: USD, isolated company)
    const compB = await db.company.create({
      data: {
        name: "Apex Global Ventures LLC",
        baseCurrency: "USD",
        liquidReserve: new Decimal(50_000),
        safetyBuffer: new Decimal(15_000),
      },
    });
    companyBId = compB.id;
    cleanupCompanyIds.push(compB.id);

    await db.client.create({
      data: {
        companyId: companyBId,
        clientName: "Pacific Coast Retailers",
        email: "billing@pacificretail.example",
        paymentTermsDays: 15,
      },
    });
  }, 35000);

  afterAll(async () => {
    for (const compId of cleanupCompanyIds) {
      try {
        await db.company.delete({ where: { id: compId } });
      } catch {
        // Ignored in cleanup
      }
    }
  }, 35000);

  // =========================================================================
  // 1. Zod Validation Contracts
  // =========================================================================
  describe("Zod Validation Contracts", () => {
    it("should accept valid treasury settings with two decimal places", () => {
      const valid = updateTreasurySettingsSchema.parse({
        liquidReserve: 4500000.5,
        safetyBuffer: 1200000.75,
      });

      expect(valid.liquidReserve).toBe(4500000.5);
      expect(valid.safetyBuffer).toBe(1200000.75);
    });

    it("should coerce string numbers from form submissions", () => {
      const valid = updateTreasurySettingsSchema.parse({
        liquidReserve: "3000000",
        safetyBuffer: "800000",
      });

      expect(valid.liquidReserve).toBe(3000000);
      expect(valid.safetyBuffer).toBe(800000);
    });

    it("should accept partial updates with only liquidReserve or only safetyBuffer", () => {
      const reserveOnly = updateTreasurySettingsSchema.parse({
        liquidReserve: 5000000,
      });
      expect(reserveOnly.liquidReserve).toBe(5000000);
      expect(reserveOnly.safetyBuffer).toBeUndefined();

      const bufferOnly = updateTreasurySettingsSchema.parse({
        safetyBuffer: 1500000,
      });
      expect(bufferOnly.liquidReserve).toBeUndefined();
      expect(bufferOnly.safetyBuffer).toBe(1500000);
    });

    it("should treat empty string or null as undefined", () => {
      const result = updateTreasurySettingsSchema.parse({
        liquidReserve: "",
        safetyBuffer: null,
      });
      expect(result.liquidReserve).toBeUndefined();
      expect(result.safetyBuffer).toBeUndefined();
    });

    it("should reject negative liquid reserve", () => {
      const result = updateTreasurySettingsSchema.safeParse({
        liquidReserve: -100,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("cannot be negative");
      }
    });

    it("should reject negative safety buffer", () => {
      const result = updateTreasurySettingsSchema.safeParse({
        safetyBuffer: -500,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("cannot be negative");
      }
    });

    it("should reject figures exceeding 10 billion maximum limit", () => {
      const result = updateTreasurySettingsSchema.safeParse({
        liquidReserve: 15_000_000_000,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("cannot exceed 10,000,000,000");
      }
    });

    it("should reject numbers with more than 2 decimal places", () => {
      const result = updateTreasurySettingsSchema.safeParse({
        liquidReserve: 1234.567,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Maximum 2 decimal places allowed");
      }
    });

    it("should parse forecastQuerySchema with standard defaults", () => {
      const query = forecastQuerySchema.parse({});
      expect(query.mode).toBe("expected");
      expect(query.horizonDays).toBe(30);
    });

    it("should accept valid mode and custom horizon in forecastQuerySchema", () => {
      const query = forecastQuerySchema.parse({
        mode: "onTime",
        horizonDays: 14,
      });
      expect(query.mode).toBe("onTime");
      expect(query.horizonDays).toBe(14);
    });

    it("should reject invalid forecast mode string", () => {
      const result = forecastQuerySchema.safeParse({
        mode: "speculative",
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-positive horizon days", () => {
      const zeroHorizon = forecastQuerySchema.safeParse({ horizonDays: 0 });
      expect(zeroHorizon.success).toBe(false);

      const negHorizon = forecastQuerySchema.safeParse({ horizonDays: -5 });
      expect(negHorizon.success).toBe(false);
    });

    it("should reject horizon days exceeding 90 days", () => {
      const excessive = forecastQuerySchema.safeParse({ horizonDays: 120 });
      expect(excessive.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. Pure Mathematical Engine & Forecast Trajectory Precision
  // =========================================================================
  describe("Pure Mathematical Engine & Trajectory Mechanics", () => {
    it("should round monetary figures using half-up arithmetic without float artifacts", () => {
      expect(roundMoney(100.005)).toBe(100.01);
      expect(roundMoney(100.004)).toBe(100.0);
      expect(roundMoney("250.75")).toBe(250.75);
    });

    it("should normalize dates to UTC midnight", () => {
      const date = toUtcMidnight("2026-11-20T17:45:22.500Z");
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCMinutes()).toBe(0);
      expect(date.getUTCSeconds()).toBe(0);
      expect(date.getUTCMilliseconds()).toBe(0);
      expect(date.toISOString()).toBe("2026-11-20T00:00:00.000Z");
    });

    it("should construct exactly 31 daily slots (Day 0 to 30) with correct date progression", () => {
      const anchor = toUtcMidnight("2026-11-19T00:00:00.000Z");
      const trajectory = buildForecastTrajectory({
        openingBalance: 1_000_000,
        safetyBuffer: 500_000,
        baseCurrency: "PKR",
        anchorDateUtc: anchor,
        unpaidInvoices: [],
        unpaidExpenses: [],
        clientLatencyMap: new Map(),
      });

      expect(trajectory.dailyPoints.length).toBe(31);
      expect(trajectory.onTimeCurve.length).toBe(31);
      expect(trajectory.expectedCurve.length).toBe(31);

      expect(trajectory.dailyPoints[0].dayIndex).toBe(0);
      expect(trajectory.dailyPoints[0].date).toBe("2026-11-19");
      expect(trajectory.dailyPoints[0].displayDate).toBe("19 Nov");
      expect(trajectory.dailyPoints[0].dayOfWeek).toBe("Thu");

      expect(trajectory.dailyPoints[30].dayIndex).toBe(30);
      expect(trajectory.dailyPoints[30].date).toBe("2026-12-19");
      expect(trajectory.dailyPoints[30].displayDate).toBe("19 Dec");
    });

    it("should apply 0.70 collection haircut factor to Day 0 overdue invoices", () => {
      const anchor = toUtcMidnight("2026-11-19T00:00:00.000Z");

      const unpaidInvoices: UnpaidInvoiceDTO[] = [
        {
          id: "inv-overdue-1",
          invoiceNumber: "INV-2026-0099",
          currency: "PKR",
          exchangeRate: 1.0,
          totalAmount: 100_000,
          baseTotalAmount: 100_000,
          paidAmount: 0,
          dueDate: "2026-11-10T00:00:00.000Z", // 9 days overdue
          clientId: "client-1",
          clientName: "Atlas Textiles",
        },
      ];

      const trajectory = buildForecastTrajectory({
        openingBalance: 1_000_000,
        safetyBuffer: 500_000,
        baseCurrency: "PKR",
        anchorDateUtc: anchor,
        unpaidInvoices,
        unpaidExpenses: [],
        clientLatencyMap: new Map(),
      });

      // Haircut: 100,000 * 0.70 = 70,000
      expect(trajectory.overdueInflowsPool).toBe(70_000);
      expect(trajectory.dailyPoints[0].inflows).toBe(70_000);
      expect(trajectory.dailyPoints[0].closingBalance).toBe(1_070_000);
      expect(trajectory.dailyPoints[0].inflowEvents[0].isOverdue).toBe(true);
      expect(trajectory.dailyPoints[0].inflowEvents[0].amount).toBe(70_000);
    });

    it("should apply 1.00 factor to Day 0 overdue expenses without haircut", () => {
      const anchor = toUtcMidnight("2026-11-19T00:00:00.000Z");

      const unpaidExpenses: UnpaidExpenseDTO[] = [
        {
          id: "exp-overdue-1",
          title: "Overdue Facility Electricity Bill",
          category: "UTILITIES",
          amount: 45_000,
          dueDate: "2026-11-15T00:00:00.000Z", // 4 days overdue
        },
      ];

      const trajectory = buildForecastTrajectory({
        openingBalance: 500_000,
        safetyBuffer: 200_000,
        baseCurrency: "PKR",
        anchorDateUtc: anchor,
        unpaidInvoices: [],
        unpaidExpenses,
        clientLatencyMap: new Map(),
      });

      expect(trajectory.overdueOutflowsPool).toBe(45_000);
      expect(trajectory.dailyPoints[0].outflows).toBe(45_000);
      expect(trajectory.dailyPoints[0].closingBalance).toBe(455_000);
      expect(trajectory.dailyPoints[0].outflowEvents[0].isOverdue).toBe(true);
      expect(trajectory.dailyPoints[0].outflowEvents[0].amount).toBe(45_000);
    });

    it("should accurately schedule on-time maturing inflows and scheduled outflows", () => {
      const anchor = toUtcMidnight("2026-11-19T00:00:00.000Z");

      const unpaidInvoices: UnpaidInvoiceDTO[] = [
        {
          id: "inv-future-1",
          invoiceNumber: "INV-2026-0101",
          currency: "PKR",
          exchangeRate: 1.0,
          totalAmount: 200_000,
          baseTotalAmount: 200_000,
          paidAmount: 0,
          dueDate: "2026-11-24T00:00:00.000Z", // Day 5
          clientId: "client-1",
          clientName: "Mehran Auto Parts",
        },
      ];

      const unpaidExpenses: UnpaidExpenseDTO[] = [
        {
          id: "exp-future-1",
          title: "Office Lease Payment",
          category: "RENT",
          amount: 80_000,
          dueDate: "2026-11-29T00:00:00.000Z", // Day 10
        },
      ];

      const trajectory = buildForecastTrajectory({
        openingBalance: 500_000,
        safetyBuffer: 200_000,
        baseCurrency: "PKR",
        anchorDateUtc: anchor,
        unpaidInvoices,
        unpaidExpenses,
        clientLatencyMap: new Map([["client-1", 0]]),
        mode: "onTime",
      });

      // Day 0 to 4: balance remains 500,000
      expect(trajectory.dailyPoints[0].closingBalance).toBe(500_000);
      expect(trajectory.dailyPoints[4].closingBalance).toBe(500_000);

      // Day 5: invoice collection occurs (+200,000)
      expect(trajectory.dailyPoints[5].inflows).toBe(200_000);
      expect(trajectory.dailyPoints[5].closingBalance).toBe(700_000);
      expect(trajectory.dailyPoints[5].inflowEvents.length).toBe(1);
      expect(trajectory.dailyPoints[5].inflowEvents[0].isOverdue).toBe(false);

      // Day 6 to 9: balance remains 700,000
      expect(trajectory.dailyPoints[9].closingBalance).toBe(700_000);

      // Day 10: rent payment occurs (-80,000)
      expect(trajectory.dailyPoints[10].outflows).toBe(80_000);
      expect(trajectory.dailyPoints[10].closingBalance).toBe(620_000);
      expect(trajectory.dailyPoints[10].outflowEvents.length).toBe(1);

      // Day 30: final balance preserved
      expect(trajectory.dailyPoints[30].closingBalance).toBe(620_000);
    });

    it("should model expected cash curve with client historical payment latency", () => {
      const anchor = toUtcMidnight("2026-11-19T00:00:00.000Z");

      // Invoice due on Day 3 (Nov 22)
      // Client has +5 days average payment delay
      // In onTime mode: arrives on Day 3
      // In expected mode: arrives on Day 3 + 5 = Day 8 (Nov 27)
      const unpaidInvoices: UnpaidInvoiceDTO[] = [
        {
          id: "inv-lat-1",
          invoiceNumber: "INV-2026-0105",
          currency: "PKR",
          exchangeRate: 1.0,
          totalAmount: 150_000,
          baseTotalAmount: 150_000,
          paidAmount: 0,
          dueDate: "2026-11-22T00:00:00.000Z", // Day 3
          clientId: "client-delayed",
          clientName: "Delayed Client Corp",
        },
      ];

      const trajectory = buildForecastTrajectory({
        openingBalance: 1_000_000,
        safetyBuffer: 400_000,
        baseCurrency: "PKR",
        anchorDateUtc: anchor,
        unpaidInvoices,
        unpaidExpenses: [],
        clientLatencyMap: new Map([["client-delayed", 5]]),
        mode: "expected",
      });

      // On-time curve reflects collection on Day 3
      expect(trajectory.onTimeCurve[2]).toBe(1_000_000);
      expect(trajectory.onTimeCurve[3]).toBe(1_150_000);
      expect(trajectory.onTimeCurve[7]).toBe(1_150_000);

      // Expected curve reflects collection on Day 8
      expect(trajectory.expectedCurve[2]).toBe(1_000_000);
      expect(trajectory.expectedCurve[3]).toBe(1_000_000); // Has not arrived yet
      expect(trajectory.expectedCurve[7]).toBe(1_000_000);
      expect(trajectory.expectedCurve[8]).toBe(1_150_000); // Arrives on Day 8

      // Active dailyPoints matches expected mode
      expect(trajectory.dailyPoints[3].inflows).toBe(0);
      expect(trajectory.dailyPoints[8].inflows).toBe(150_000);
      expect(trajectory.dailyPoints[8].closingBalance).toBe(1_150_000);
    });

    it("should track safety buffer breaches and calculate deficit metrics", () => {
      const anchor = toUtcMidnight("2026-11-19T00:00:00.000Z");

      // Opening: 300,000, Safety Buffer: 500,000
      // Day 4: Massive scheduled vendor payment 200,000 -> drops balance to 100,000
      // Deficit = 500,000 - 100,000 = 400,000
      // Day 10: Inflow of 600,000 -> raises balance to 700,000 (breach resolves)
      const unpaidExpenses: UnpaidExpenseDTO[] = [
        {
          id: "exp-large",
          title: "Heavy Equipment Maintenance",
          category: "SUPPLIERS",
          amount: 200_000,
          dueDate: "2026-11-23T00:00:00.000Z", // Day 4
        },
      ];

      const unpaidInvoices: UnpaidInvoiceDTO[] = [
        {
          id: "inv-rescue",
          invoiceNumber: "INV-2026-0110",
          currency: "PKR",
          exchangeRate: 1.0,
          totalAmount: 600_000,
          baseTotalAmount: 600_000,
          paidAmount: 0,
          dueDate: "2026-11-29T00:00:00.000Z", // Day 10
          clientId: "client-good",
          clientName: "Good Client",
        },
      ];

      const trajectory = buildForecastTrajectory({
        openingBalance: 300_000,
        safetyBuffer: 500_000,
        baseCurrency: "PKR",
        anchorDateUtc: anchor,
        unpaidInvoices,
        unpaidExpenses,
        clientLatencyMap: new Map([["client-good", 0]]),
        mode: "onTime",
      });

      // Day 0 starts in breach because 300,000 < 500,000
      expect(trajectory.dailyPoints[0].isBreach).toBe(true);
      expect(trajectory.dailyPoints[0].deficitAmount).toBe(200_000);

      // Day 4 worsens breach: 100,000 < 500,000
      expect(trajectory.dailyPoints[4].closingBalance).toBe(100_000);
      expect(trajectory.dailyPoints[4].isBreach).toBe(true);
      expect(trajectory.dailyPoints[4].deficitAmount).toBe(400_000);

      // Day 10 resolves breach: 700,000 >= 500,000
      expect(trajectory.dailyPoints[10].closingBalance).toBe(700_000);
      expect(trajectory.dailyPoints[10].isBreach).toBe(false);
      expect(trajectory.dailyPoints[10].deficitAmount).toBe(0);
    });

    it("should preserve continuous mathematical equality across all 31 days", () => {
      const anchor = toUtcMidnight("2026-11-19T00:00:00.000Z");

      const unpaidInvoices: UnpaidInvoiceDTO[] = [
        {
          id: "inv-seq-1",
          invoiceNumber: "INV-2026-0120",
          currency: "PKR",
          exchangeRate: 1.0,
          totalAmount: 100_000,
          baseTotalAmount: 100_000,
          paidAmount: 20_000, // 80,000 remaining
          dueDate: "2026-11-25T00:00:00.000Z", // Day 6
          clientId: "client-seq",
          clientName: "Sequence Client",
        },
      ];

      const unpaidExpenses: UnpaidExpenseDTO[] = [
        {
          id: "exp-seq-1",
          title: "Cloud Infrastructure",
          category: "SOFTWARE",
          amount: 35_000,
          dueDate: "2026-11-22T00:00:00.000Z", // Day 3
        },
      ];

      const trajectory = buildForecastTrajectory({
        openingBalance: 800_000,
        safetyBuffer: 300_000,
        baseCurrency: "PKR",
        anchorDateUtc: anchor,
        unpaidInvoices,
        unpaidExpenses,
        clientLatencyMap: new Map(),
      });

      let prevClosing = trajectory.dailyPoints[0].openingBalance;
      let cumulativeNet = 0;

      for (let i = 0; i < trajectory.dailyPoints.length; i++) {
        const p = trajectory.dailyPoints[i];

        // Day opening must equal previous closing
        expect(p.openingBalance).toBe(prevClosing);

        // Net change must equal inflows - outflows
        expect(p.netChange).toBe(roundMoney(p.inflows - p.outflows));

        // Closing balance must equal opening + net change
        expect(p.closingBalance).toBe(roundMoney(p.openingBalance + p.netChange));

        cumulativeNet = roundMoney(cumulativeNet + p.netChange);
        prevClosing = p.closingBalance;
      }

      // Day 30 closing balance must equal Day 0 opening + cumulative net
      expect(trajectory.dailyPoints[30].closingBalance).toBe(
        roundMoney(trajectory.dailyPoints[0].openingBalance + cumulativeNet)
      );
    });

    it("should correctly convert foreign currency invoices using spot exchange rate", () => {
      const anchor = toUtcMidnight("2026-11-19T00:00:00.000Z");

      // 1,000 USD invoice with 278.4 exchange rate -> 278,400 PKR
      const unpaidInvoices: UnpaidInvoiceDTO[] = [
        {
          id: "inv-fx-1",
          invoiceNumber: "INV-2026-FX01",
          currency: "USD",
          exchangeRate: 278.4,
          totalAmount: 1000,
          baseTotalAmount: 278400,
          paidAmount: 0,
          dueDate: "2026-11-23T00:00:00.000Z", // Day 4
          clientId: "client-usd",
          clientName: "Global Trade LLC",
        },
      ];

      const trajectory = buildForecastTrajectory({
        openingBalance: 1_000_000,
        safetyBuffer: 200_000,
        baseCurrency: "PKR",
        anchorDateUtc: anchor,
        unpaidInvoices,
        unpaidExpenses: [],
        clientLatencyMap: new Map(),
        mode: "onTime",
      });

      expect(trajectory.dailyPoints[4].inflows).toBe(278_400);
      expect(trajectory.dailyPoints[4].inflowEvents[0].amount).toBe(278_400);
      expect(trajectory.dailyPoints[4].closingBalance).toBe(1_278_400);
    });
  });

  // =========================================================================
  // 3. Live Database Integration & Multi-Tenant Isolation
  // =========================================================================
  describe("Live Multi-Tenant Integration & Settings Management", () => {
    it("should fetch initial treasury settings for Company A", async () => {
      const settings = await getTreasurySettings(companyAId);
      expect(settings.liquidReserve).toBe(2_500_000);
      expect(settings.safetyBuffer).toBe(1_000_000);
      expect(settings.baseCurrency).toBe("PKR");
    }, 15000);

    it("should atomically update treasury settings and log audit event", async () => {
      const updated = await updateTreasurySettings(
        companyAId,
        {
          liquidReserve: 3_200_000,
          safetyBuffer: 1_500_000,
        },
        "user-owner-a"
      );

      expect(updated.liquidReserve).toBe(3_200_000);
      expect(updated.safetyBuffer).toBe(1_500_000);
      expect(updated.baseCurrency).toBe("PKR");

      // Verify DB persistence
      const inDb = await db.company.findUnique({
        where: { id: companyAId },
      });
      expect(Number(inDb?.liquidReserve)).toBe(3_200_000);
      expect(Number(inDb?.safetyBuffer)).toBe(1_500_000);

      // Verify Audit Log
      const auditLog = await db.auditLog.findFirst({
        where: {
          companyId: companyAId,
          entityType: "WORKSPACE",
          action: "UPDATE",
        },
        orderBy: { timestamp: "desc" },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.userId).toBe("user-owner-a");
      expect(auditLog?.details).toContain("3200000");
      expect(auditLog?.details).toContain("1500000");
    }, 20000);

    it("should prevent cross-tenant settings leakage: Company B is isolated", async () => {
      const settingsB = await getTreasurySettings(companyBId);
      expect(settingsB.liquidReserve).toBe(50_000);
      expect(settingsB.safetyBuffer).toBe(15_000);
      expect(settingsB.baseCurrency).toBe("USD");
    }, 15000);

    it("should compute client historical payment latency from settled invoices", async () => {
      // Create settled invoices for Client A:
      // Inv 1: Due Nov 1, Paid Nov 4 (+3 days late)
      // Inv 2: Due Nov 5, Paid Nov 10 (+5 days late)
      // Average latency = (3 + 5) / 2 = 4.0 days
      const year = new Date().getFullYear();
      await db.invoice.create({
        data: {
          companyId: companyAId,
          clientId: clientAId,
          invoiceNumber: `INV-${year}-SETTLED-01`,
          currency: "PKR",
          issueDate: new Date("2026-10-15T00:00:00.000Z"),
          dueDate: new Date("2026-11-01T00:00:00.000Z"),
          totalAmount: 100_000,
          baseTotalAmount: 100_000,
          paidAmount: 100_000,
          status: "PAID",
          paidAt: new Date("2026-11-04T00:00:00.000Z"),
        },
      });

      await db.invoice.create({
        data: {
          companyId: companyAId,
          clientId: clientAId,
          invoiceNumber: `INV-${year}-SETTLED-02`,
          currency: "PKR",
          issueDate: new Date("2026-10-20T00:00:00.000Z"),
          dueDate: new Date("2026-11-05T00:00:00.000Z"),
          totalAmount: 150_000,
          baseTotalAmount: 150_000,
          paidAmount: 150_000,
          status: "PAID",
          paidAt: new Date("2026-11-10T00:00:00.000Z"),
        },
      });

      const latencies = await computeClientLatencies(companyAId);
      expect(latencies.get(clientAId)).toBe(4.0);
    }, 25000);

    it("should execute end-to-end get30DayForecast against live database", async () => {
      const year = new Date().getFullYear();
      const anchor = toUtcMidnight("2026-11-19T00:00:00.000Z");

      // 1. Create Overdue Invoice for Company A (due Nov 10)
      await db.invoice.create({
        data: {
          companyId: companyAId,
          clientId: clientAId,
          invoiceNumber: `INV-${year}-OVERDUE-01`,
          currency: "PKR",
          issueDate: new Date("2026-10-10T00:00:00.000Z"),
          dueDate: new Date("2026-11-10T00:00:00.000Z"),
          totalAmount: 100_000,
          baseTotalAmount: 100_000,
          paidAmount: 0,
          status: "OVERDUE",
        },
      });

      // 2. Create Future Maturing Invoice for Company A (due Nov 24, Day 5)
      // Client A latency is 4.0 days -> In expected mode: Day 5 + 4 = Day 9 (Nov 28)
      await db.invoice.create({
        data: {
          companyId: companyAId,
          clientId: clientAId,
          invoiceNumber: `INV-${year}-MATURE-01`,
          currency: "PKR",
          issueDate: new Date("2026-11-10T00:00:00.000Z"),
          dueDate: new Date("2026-11-24T00:00:00.000Z"),
          totalAmount: 200_000,
          baseTotalAmount: 200_000,
          paidAmount: 0,
          status: "SENT",
        },
      });

      // 3. Create Scheduled Expense for Company A (due Nov 22, Day 3)
      await db.expense.create({
        data: {
          companyId: companyAId,
          title: "Quarterly Insurance Retainer",
          category: "OTHER",
          amount: new Decimal(50_000),
          dueDate: new Date("2026-11-22T00:00:00.000Z"),
          recurrence: "NONE",
          isPaid: false,
        },
      });

      // Execute forecast in expected mode with anchor date
      const forecast = await get30DayForecast(companyAId, "expected", anchor);

      expect(forecast.baseCurrency).toBe("PKR");
      expect(forecast.openingBalance).toBe(3_200_000);
      expect(forecast.safetyBuffer).toBe(1_500_000);

      // Overdue pool: 100,000 * 0.70 haircut = 70,000
      expect(forecast.overdueInflowsPool).toBe(70_000);
      expect(forecast.dailyPoints[0].inflows).toBe(70_000);
      expect(forecast.dailyPoints[0].closingBalance).toBe(3_270_000);

      // Day 3 expense: -50,000
      expect(forecast.dailyPoints[3].outflows).toBe(50_000);
      expect(forecast.dailyPoints[3].closingBalance).toBe(3_220_000);

      // Day 5 invoice in expected mode is delayed by 4 days -> Day 9
      expect(forecast.dailyPoints[5].inflows).toBe(0);
      expect(forecast.dailyPoints[9].inflows).toBe(200_000);
      expect(forecast.dailyPoints[9].closingBalance).toBe(3_420_000);

      // On-time curve vs expected curve divergence
      expect(forecast.onTimeCurve[5]).toBe(3_420_000); // Collected on Day 5 on-time
      expect(forecast.expectedCurve[5]).toBe(3_220_000); // Delayed on Day 5 expected
      expect(forecast.expectedCurve[9]).toBe(3_420_000); // Arrives on Day 9

      // Forecast summary metrics
      expect(forecast.total30DayInflow).toBe(270_000); // 70k overdue + 200k invoice
      expect(forecast.total30DayOutflow).toBe(50_000); // 50k expense
      expect(forecast.net30DayChange).toBe(220_000);
      expect(forecast.closing30DayBalance).toBe(3_420_000);
      expect(forecast.breachDurationDays).toBe(0); // Balance stays > 1.5M buffer
      expect(forecast.firstBreachDate).toBeNull();
      expect(forecast.firstBreachDayOffset).toBeNull();
    }, 30000);

    it("should retrieve forecast through multi-tenant getCached30DayForecast", async () => {
      const anchor = toUtcMidnight("2026-11-19T00:00:00.000Z");
      const cached = await getCached30DayForecast(companyAId, "expected", anchor);

      expect(cached).toBeDefined();
      expect(cached.baseCurrency).toBe("PKR");
      expect(cached.dailyPoints.length).toBe(31);
      expect(cached.onTimeCurve.length).toBe(31);
      expect(cached.expectedCurve.length).toBe(31);
      expect(cached.openingBalance).toBe(3_200_000);
    }, 20000);

    it("should return null when getDayForecastDetails receives an invalid date string", async () => {
      const invalid = await getDayForecastDetails(companyAId, "invalid-date");
      expect(invalid).toBeNull();
    });

    it("should return null when getDayForecastDetails receives a date outside 30-day window", async () => {
      const outside = await getDayForecastDetails(companyAId, "2099-01-01");
      expect(outside).toBeNull();
    });

    it("should retrieve granular Day 0 breakdown with itemized overdue invoices and payables", async () => {
      const todayStr = toUtcMidnight(new Date()).toISOString().slice(0, 10);
      const details = await getDayForecastDetails(companyAId, todayStr, "expected");

      expect(details).toBeDefined();
      if (details) {
        expect(details.date).toBe(todayStr);
        expect(details.dayIndex).toBe(0);
        expect(details.isToday).toBe(true);
        expect(details.baseCurrency).toBe("PKR");
        expect(details.openingBalance).toBe(3_200_000);
        expect(details.nextDate).not.toBeNull();
        expect(details.inflows.length).toBeGreaterThan(0);
        expect(details.inflows[0].invoiceNumber).toBeDefined();
        expect(details.inflows[0].baseAmount).toBeGreaterThan(0);
      }
    }, 30000);

    it("should enforce tenant isolation in getDayForecastDetails: Company B cannot see Company A items", async () => {
      const todayStr = toUtcMidnight(new Date()).toISOString().slice(0, 10);
      const detailsB = await getDayForecastDetails(companyBId, todayStr, "expected");

      expect(detailsB).toBeDefined();
      if (detailsB) {
        // Company B has zero invoices and zero expenses
        expect(detailsB.inflows.length).toBe(0);
        expect(detailsB.outflows.length).toBe(0);
        expect(detailsB.totalInflows).toBe(0);
        expect(detailsB.totalOutflows).toBe(0);
      }
    }, 30000);

    it("should retrieve day breakdown via getCachedDayForecastDetails", async () => {
      const todayStr = toUtcMidnight(new Date()).toISOString().slice(0, 10);
      const cached = await getCachedDayForecastDetails(companyAId, todayStr, "expected");

      expect(cached).toBeDefined();
      if (cached) {
        expect(cached.date).toBe(todayStr);
        expect(cached.dayIndex).toBe(0);
      }
    }, 20000);
  });

  // =========================================================================
  // 4. Server Actions Authentication & Tenancy Protection Contracts
  // =========================================================================
  describe("Server Actions Security & Error Contracts", () => {
    it("should reject unauthenticated updateTreasurySettingsAction calls", async () => {
      const result = await updateTreasurySettingsAction({
        liquidReserve: 5_000_000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("You must be signed in to perform this action.");
    });

    it("should reject unauthenticated getForecastAction calls", async () => {
      const result = await getForecastAction("expected");

      expect(result.success).toBe(false);
      expect(result.error).toContain("You must be signed in to perform this action.");
    });
  });
});
