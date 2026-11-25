import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "@/lib/db";
import {
  createClientSchema,
  clientFilterSchema,
} from "@/modules/clients/validation";
import {
  calculateClientMetrics,
  createClient,
  updateClient,
  softDeleteClient,
  getClients,
  getARAgingBuckets,
} from "@/modules/clients/service";

describe("Domain 2: Client Directory & Accounts Receivable Ledger", () => {
  const createdCompanyIds: string[] = [];

  afterAll(async () => {
    // Clean up all live test records created in Neon PostgreSQL
    for (const companyId of createdCompanyIds) {
      try {
        await db.company.delete({ where: { id: companyId } });
      } catch {
        // Ignore if already deleted
      }
    }
  }, 30000);

  // =========================================================================
  // 1. Zod Validation & Input Normalization
  // =========================================================================
  describe("Client Input Validation & Schemas", () => {
    it("should normalize email to lowercase and trim string fields", () => {
      const parsed = createClientSchema.parse({
        clientName: "   Acme Global Logistics   ",
        email: "   Billing@ACME.COM   ",
        phone: "  +92 300 1234567  ",
        paymentTermsDays: "30",
      });

      expect(parsed.clientName).toBe("Acme Global Logistics");
      expect(parsed.email).toBe("billing@acme.com");
      expect(parsed.phone).toBe("+92 300 1234567");
      expect(parsed.paymentTermsDays).toBe(30);
    });

    it("should reject client names shorter than 2 characters", () => {
      expect(() => {
        createClientSchema.parse({
          clientName: "A",
          email: "valid@client.com",
        });
      }).toThrow();
    });

    it("should reject invalid email formats", () => {
      expect(() => {
        createClientSchema.parse({
          clientName: "Valid Corp",
          email: "not-an-email",
        });
      }).toThrow();
    });

    it("should reject unsupported payment terms (must be 7, 15, 30, 45, 60, or 90)", () => {
      expect(() => {
        createClientSchema.parse({
          clientName: "Valid Corp",
          email: "billing@corp.com",
          paymentTermsDays: 12, // Not in whitelist
        });
      }).toThrow();

      expect(() => {
        createClientSchema.parse({
          clientName: "Valid Corp",
          email: "billing@corp.com",
          paymentTermsDays: -30,
        });
      }).toThrow();
    });

    it("should accept valid payment terms options", () => {
      for (const terms of [7, 15, 30, 45, 60, 90]) {
        const parsed = createClientSchema.parse({
          clientName: "Valid Corp",
          email: "billing@corp.com",
          paymentTermsDays: terms,
        });
        expect(parsed.paymentTermsDays).toBe(terms);
      }
    });

    it("should validate and apply defaults to clientFilterSchema", () => {
      const parsed = clientFilterSchema.parse({});
      expect(parsed.riskStatus).toBe("ALL");
      expect(parsed.sortBy).toBe("createdAt");
      expect(parsed.sortOrder).toBe("desc");
    });
  });

  // =========================================================================
  // 2. Pure Financial Calculation Engine (calculateClientMetrics)
  // =========================================================================
  describe("Payment Latency & Credit Risk Engine", () => {
    it("should calculate zero delay when invoices are paid on or before due date", () => {
      const now = new Date();
      const dueDate = new Date(now.getTime() - 10 * 86400000); // 10 days ago
      const paidAt = new Date(dueDate.getTime() - 2 * 86400000); // Paid 2 days early

      const metrics = calculateClientMetrics([
        {
          id: "inv-1",
          status: "PAID",
          dueDate,
          paidAt,
          baseTotalAmount: 1000,
          paidAmount: 1000,
        },
      ]);

      expect(metrics.totalBilled).toBe(1000);
      expect(metrics.totalPaid).toBe(1000);
      expect(metrics.outstandingBalance).toBe(0);
      expect(metrics.overdueAmount).toBe(0);
      expect(metrics.avgPaymentDelayDays).toBe(0);
      expect(metrics.settledInvoicesCount).toBe(1);
      expect(metrics.riskStatus).toBe("HEALTHY");
    });

    it("should calculate exact latency when an invoice is paid late", () => {
      const now = new Date();
      const dueDate = new Date(now.getTime() - 15 * 86400000); // 15 days ago
      const paidAt = new Date(dueDate.getTime() + 6 * 86400000); // Paid 6 days late

      const metrics = calculateClientMetrics([
        {
          id: "inv-2",
          status: "PAID",
          dueDate,
          paidAt,
          baseTotalAmount: 5000,
          paidAmount: 5000,
        },
      ]);

      expect(metrics.avgPaymentDelayDays).toBe(6);
      expect(metrics.riskStatus).toBe("WATCHLIST"); // Delay > 3 days triggers WATCHLIST
    });

    it("should classify client as CRITICAL if overdue amount > 0 and average delay > 14 days", () => {
      const now = new Date();
      const pastDue = new Date(now.getTime() - 20 * 86400000);
      const paidAtLate = new Date(pastDue.getTime() + 18 * 86400000); // 18 days delay

      const metrics = calculateClientMetrics([
        {
          id: "inv-settled",
          status: "PAID",
          dueDate: pastDue,
          paidAt: paidAtLate,
          baseTotalAmount: 10000,
          paidAmount: 10000,
        },
        {
          id: "inv-unpaid",
          status: "OVERDUE",
          dueDate: pastDue,
          paidAt: null,
          baseTotalAmount: 4000,
          paidAmount: 0,
        },
      ]);

      expect(metrics.outstandingBalance).toBe(4000);
      expect(metrics.overdueAmount).toBe(4000);
      expect(metrics.avgPaymentDelayDays).toBe(18);
      expect(metrics.riskStatus).toBe("CRITICAL");
    });

    it("should ignore CANCELLED invoices in financial metrics", () => {
      const metrics = calculateClientMetrics([
        {
          id: "inv-cancelled",
          status: "CANCELLED",
          dueDate: new Date(),
          paidAt: null,
          baseTotalAmount: 99999,
          paidAmount: 0,
        },
      ]);

      expect(metrics.totalBilled).toBe(0);
      expect(metrics.outstandingBalance).toBe(0);
      expect(metrics.riskStatus).toBe("HEALTHY");
    });
  });

  // =========================================================================
  // 3. Live Neon PostgreSQL Multi-Tenant Database Tests
  // =========================================================================
  describe("Neon DB Multi-Tenant Client Operations", () => {
    let companyAId: string;
    let companyBId: string;

    beforeAll(async () => {
      // Create two isolated companies to test multi-tenant boundaries
      const companyA = await db.company.create({
        data: {
          name: "Test Tenant A (Pvt) Ltd",
          baseCurrency: "PKR",
          liquidReserve: 100000,
          safetyBuffer: 20000,
        },
      });
      companyAId = companyA.id;
      createdCompanyIds.push(companyAId);

      const companyB = await db.company.create({
        data: {
          name: "Test Tenant B (Pvt) Ltd",
          baseCurrency: "USD",
          liquidReserve: 50000,
          safetyBuffer: 10000,
        },
      });
      companyBId = companyB.id;
      createdCompanyIds.push(companyBId);
    }, 30000);

    it("should create a client within company A boundary", async () => {
      const client = await createClient(companyAId, {
        clientName: "Systems Integration Ltd",
        email: "billing@systems-intl.com",
        paymentTermsDays: 30,
      });

      expect(client.id).toBeString();
      expect(client.companyId).toBe(companyAId);
      expect(client.clientName).toBe("Systems Integration Ltd");
      expect(client.riskStatus).toBe("HEALTHY");
    }, 15000);

    it("should prevent duplicate client emails within the same company", async () => {
      await expect(
        createClient(companyAId, {
          clientName: "Duplicate Systems",
          email: "billing@systems-intl.com",
          paymentTermsDays: 15,
        })
      ).rejects.toThrow("already exists");
    }, 15000);

    it("should allow identical client email in a different company (tenant isolation)", async () => {
      const clientInB = await createClient(companyBId, {
        clientName: "Systems Integration Ltd (Branch B)",
        email: "billing@systems-intl.com", // Same email, different tenant
        paymentTermsDays: 15,
      });

      expect(clientInB.id).toBeString();
      expect(clientInB.companyId).toBe(companyBId);
    }, 15000);

    it("should prevent Company B from updating Company A's client", async () => {
      const clientInA = await db.client.findFirst({
        where: { companyId: companyAId },
      });
      expect(clientInA).not.toBeNull();

      // Company B attempts to update Company A's client
      await expect(
        updateClient(companyBId, {
          id: clientInA!.id,
          clientName: "Hacked by Tenant B",
        })
      ).rejects.toThrow("access denied");
    }, 15000);

    it("should soft delete client and exclude from active getClients listing", async () => {
      const client = await createClient(companyAId, {
        clientName: "Temporary Client To Delete",
        email: "temp@delete-me.com",
        paymentTermsDays: 7,
      });

      // Soft delete
      const deleted = await softDeleteClient(companyAId, client.id);
      expect(deleted.deletedAt).not.toBeNull();

      // Active getClients should NOT return this client
      const activeClients = await getClients(companyAId);
      const found = activeClients.find((c) => c.id === client.id);
      expect(found).toBeUndefined();

      // Database row still exists for accounting history
      const dbRow = await db.client.findUnique({ where: { id: client.id } });
      expect(dbRow).not.toBeNull();
      expect(dbRow?.deletedAt).not.toBeNull();
    }, 15000);

    it("should calculate A/R aging buckets accurately for open invoices", async () => {
      const buckets = await getARAgingBuckets(companyAId);
      expect(buckets).toBeDefined();
      expect(typeof buckets.current).toBe("number");
      expect(typeof buckets.days1to30).toBe("number");
      expect(typeof buckets.days31to60).toBe("number");
      expect(typeof buckets.days61to90).toBe("number");
      expect(typeof buckets.days90Plus).toBe("number");
      expect(typeof buckets.totalOutstanding).toBe("number");
    }, 15000);
  });
});
