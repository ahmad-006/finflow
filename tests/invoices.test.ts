import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "@/lib/db";
import Decimal from "decimal.js";
import {
  calculateLineItem,
  calculateInvoiceTotals,
  roundMoney,
  roundFx,
  formatMoney,
  convertAmount,
  DEFAULT_EXCHANGE_RATES,
} from "@/modules/invoices/currency";
import {
  createInvoiceSchema,
  invoiceItemSchema,
  recordPaymentSchema,
} from "@/modules/invoices/validation";
import {
  createInvoice,
  updateInvoice,
  generateInvoiceNumber,
  markInvoiceSent,
  recordInvoicePayment,
  cancelInvoice,
  getInvoices,
  getInvoiceById,
  getInvoiceByViewToken,
  getInvoiceKPIs,
} from "@/modules/invoices/service";

describe("Domain 3: Invoicing Engine & Spot Multi-Currency Service", () => {
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

    // 1. Create Tenant A (Base Currency: PKR)
    const compA = await db.company.create({
      data: {
        name: "Acme Industrial Logistics (Pvt) Ltd",
        baseCurrency: "PKR",
      },
    });
    companyAId = compA.id;
    cleanupCompanyIds.push(compA.id);

    const clientA = await db.client.create({
      data: {
        companyId: companyAId,
        clientName: "Atlas Maritime Transport",
        email: "billing@atlasmaritime.com",
        paymentTermsDays: 30,
      },
    });
    clientAId = clientA.id;

    // 2. Create Tenant B (Base Currency: USD, isolated company)
    const compB = await db.company.create({
      data: {
        name: "Zenith Global Corp",
        baseCurrency: "USD",
      },
    });
    companyBId = compB.id;
    cleanupCompanyIds.push(compB.id);

    const clientB = await db.client.create({
      data: {
        companyId: companyBId,
        clientName: "Pacific Ocean Logistics",
        email: "accounts@pacificocean.com",
        paymentTermsDays: 15,
      },
    });
    clientBId = clientB.id;
  }, 35000);

  afterAll(async () => {
    for (const compId of cleanupCompanyIds) {
      try {
        await db.company.delete({ where: { id: compId } });
      } catch {
        // Ignored
      }
    }
  }, 35000);

  // =========================================================================
  // 1. Arbitrary-Precision Financial Arithmetic & Spot FX Math (Step 3.3)
  // =========================================================================
  describe("Arbitrary Precision & Multi-Currency Engine", () => {
    it("should compute line items with zero floating-point artifacts", () => {
      const lineTotal = calculateLineItem("19.99", "3");
      expect(lineTotal.toFixed(2)).toBe("59.97");

      const fractionalHours = calculateLineItem(7.75, 125.4);
      expect(fractionalHours.toFixed(2)).toBe("971.85");
    });

    it("should perform financial round half-up rounding", () => {
      expect(roundMoney("10.005").toFixed(2)).toBe("10.01");
      expect(roundMoney("10.004").toFixed(2)).toBe("10.00");
    });

    it("should preserve 8-decimal precision for spot foreign exchange rates", () => {
      const fx = roundFx("278.405678912");
      expect(fx.toString()).toBe("278.40567891");
    });

    it("should accurately compute invoice totals with VAT and base normalization", () => {
      const items = [
        { quantity: 2, unitPrice: 50000 },
        { quantity: 1.5, unitPrice: 20000 },
      ];
      const result = calculateInvoiceTotals(items, 16, "PKR");
      expect(result.subtotal).toBe(130000);
      expect(result.taxRate).toBe(16);
      expect(result.taxAmount).toBe(20800);
      expect(result.totalAmount).toBe(150800);
      expect(result.baseTotalAmount).toBe(150800);
      expect(result.exchangeRate).toBe(1.0);
    });

    it("should normalize foreign currency to company base currency via frozen spot FX", () => {
      const items = [
        { quantity: 10, unitPrice: 150 },
        { quantity: 5, unitPrice: 100 },
      ];
      // Subtotal $2,000, 5% Tax ($100), Total $2,100, FX Rate 278.40 => 584,640 PKR
      const result = calculateInvoiceTotals(items, 5, "USD", 278.4);
      expect(result.subtotal).toBe(2000);
      expect(result.taxAmount).toBe(100);
      expect(result.totalAmount).toBe(2100);
      expect(result.exchangeRate).toBe(278.4);
      expect(result.baseTotalAmount).toBe(584640);
    });

    it("should format currency symbols cleanly according to Claude Inkline specifications", () => {
      expect(formatMoney(150800, "PKR")).toBe("₨ 150,800.00");
      expect(formatMoney(2100, "USD")).toBe("$ 2,100.00");
      expect(formatMoney(1850.5, "EUR")).toBe("€ 1,850.50");
      expect(formatMoney(4200, "AED")).toBe("AED 4,200.00");
    });

    it("should convert amounts across currencies via base PKR pivot", () => {
      const converted = convertAmount(1000, "USD", "EUR");
      expect(converted.toFixed(2)).toBe("924.15");
    });
  });

  // =========================================================================
  // 2. Domain Contracts & Zod Validation Invariants (Step 3.2)
  // =========================================================================
  describe("Zod Validation Contracts", () => {
    it("should accept valid invoice items", () => {
      const item = invoiceItemSchema.parse({
        description: "Cloud Architecture Audit",
        quantity: "40",
        unitPrice: "125.50",
      });
      expect(item.description).toBe("Cloud Architecture Audit");
      expect(item.quantity).toBe(40);
      expect(item.unitPrice).toBe(125.5);
    });

    it("should enforce dueDate >= issueDate constraint", () => {
      const valid = createInvoiceSchema.safeParse({
        clientId: "123e4567-e89b-12d3-a456-426614174000",
        currency: "USD",
        issueDate: "2026-11-20",
        dueDate: "2026-12-20",
        items: [{ description: "Consulting", quantity: 1, unitPrice: 100 }],
      });
      expect(valid.success).toBe(true);

      const invalid = createInvoiceSchema.safeParse({
        clientId: "123e4567-e89b-12d3-a456-426614174000",
        currency: "USD",
        issueDate: "2026-12-20",
        dueDate: "2026-11-20",
        items: [{ description: "Consulting", quantity: 1, unitPrice: 100 }],
      });
      expect(invalid.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. Sequential Numbering & ACID Service Operations (Step 3.4)
  // =========================================================================
  describe("ACID Invoicing Service & Lifecycle Operations", () => {
    let createdInvoiceId: string;
    let viewToken: string;

    it("should generate sequential numbering INV-YYYY-0001 per company", async () => {
      const year = new Date().getFullYear();
      const numA = await generateInvoiceNumber(db, companyAId);
      const numB = await generateInvoiceNumber(db, companyBId);
      expect(numA).toBe(`INV-${year}-0001`);
      expect(numB).toBe(`INV-${year}-0001`);
    }, 15000);

    it("should atomically create invoice and line items in transaction", async () => {
      const invoice = await createInvoice(companyAId, {
        clientId: clientAId,
        currency: "USD",
        exchangeRate: 278.4,
        issueDate: "2026-11-20",
        dueDate: "2026-12-20",
        taxRate: 5,
        notes: "Milestone 1 Deliverable",
        items: [
          { description: "API Core Architecture", quantity: 10, unitPrice: 150 },
          { description: "Database Optimization", quantity: 5, unitPrice: 100 },
        ],
      });

      expect(invoice.id).toBeDefined();
      expect(invoice.invoiceNumber).toMatch(/^INV-\d{4}-0001$/);
      expect(invoice.subtotal).toBe(2000);
      expect(invoice.taxAmount).toBe(100);
      expect(invoice.totalAmount).toBe(2100);
      expect(invoice.baseTotalAmount).toBe(584640);
      expect(invoice.status).toBe("DRAFT");
      expect(invoice.items.length).toBe(2);

      createdInvoiceId = invoice.id;
      viewToken = invoice.viewToken;
    }, 25000);

    it("should increment next sequence to 0002 for Company A", async () => {
      const year = new Date().getFullYear();
      const nextNum = await generateInvoiceNumber(db, companyAId);
      expect(nextNum).toBe(`INV-${year}-0002`);
    }, 15000);

    it("should reject creation if client belongs to another company", async () => {
      await expect(
        createInvoice(companyAId, {
          clientId: clientBId,
          currency: "PKR",
          issueDate: "2026-11-20",
          dueDate: "2026-12-20",
          items: [{ description: "Unauthorized", quantity: 1, unitPrice: 100 }],
        })
      ).rejects.toThrow("Client not found or does not belong to your organization.");
    }, 15000);

    it("should update draft invoice financial line items and recompute totals", async () => {
      const updated = await updateInvoice(companyAId, {
        id: createdInvoiceId,
        taxRate: 10, // Increased tax to 10%
        items: [
          { description: "API Core Architecture", quantity: 10, unitPrice: 150 },
          { description: "Database Optimization", quantity: 10, unitPrice: 100 }, // Increased qty to 10
        ],
      });

      // Subtotal = $2,500, Tax 10% = $250, Total = $2,750, Base = $2,750 * 278.40 = 765,600 PKR
      expect(updated.subtotal).toBe(2500);
      expect(updated.taxAmount).toBe(250);
      expect(updated.totalAmount).toBe(2750);
      expect(updated.baseTotalAmount).toBe(765600);
    }, 25000);

    it("should transition status from DRAFT to SENT", async () => {
      const sent = await markInvoiceSent(companyAId, createdInvoiceId);
      expect(sent.status).toBe("SENT");
    }, 15000);

    it("should record customer payment and generate INFLOW transaction", async () => {
      const paid = await recordInvoicePayment(companyAId, {
        invoiceId: createdInvoiceId,
        paidAmount: 2750,
        notes: "Wire settlement reference #WT-99120",
      });

      expect(paid.status).toBe("PAID");
      expect(paid.paidAmount).toBe(2750);
      expect(paid.paidAt).toBeDefined();

      // Check INFLOW transaction
      const transaction = await db.transaction.findFirst({
        where: {
          invoiceId: createdInvoiceId,
          companyId: companyAId,
        },
      });

      expect(transaction).toBeDefined();
      expect(transaction?.type).toBe("INFLOW");
      expect(Number(transaction?.amount)).toBe(2750);
      expect(Number(transaction?.baseAmount)).toBe(765600);
    }, 25000);

    it("should retrieve public guest view via viewToken without authentication", async () => {
      const guestView = await getInvoiceByViewToken(viewToken);
      expect(guestView).toBeDefined();
      expect(guestView?.invoice.id).toBe(createdInvoiceId);
      expect(guestView?.company.name).toBe("Acme Industrial Logistics (Pvt) Ltd");
      expect(guestView?.invoice.items.length).toBe(2);
    }, 15000);

    it("should compute accurate KPI metrics for the executive dashboard", async () => {
      const kpis = await getInvoiceKPIs(companyAId);
      expect(kpis.totalOutstanding).toBe(0);
      expect(kpis.totalOverdue).toBe(0);
      expect(kpis.totalPaidThisMonth).toBe(765600);
    }, 15000);

    it("should prevent cross-tenant access when fetching invoice by ID", async () => {
      const foreign = await getInvoiceById(companyBId, createdInvoiceId);
      expect(foreign).toBeNull();
    }, 15000);
  });
});
