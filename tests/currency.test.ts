import { describe, it, expect } from "bun:test";
import {
  calculateLineItem,
  calculateInvoiceTotals,
  roundMoney,
  roundFx,
  formatMoney,
  convertAmount,
} from "@/modules/invoices/currency";
import {
  createInvoiceSchema,
  invoiceItemSchema,
  recordPaymentSchema,
} from "@/modules/invoices/validation";

describe("Batch 1: Multi-Currency Arithmetic & Zod Contracts", () => {
  describe("Arbitrary Precision & Rounding (Step 3.3)", () => {
    it("should accurately calculate fractional quantity and unit price without floating-point artifacts", () => {
      // 0.1 + 0.2 in standard JS float = 0.30000000000000004
      // 33.33 * 3 in standard JS float = 99.99
      // Let's test a case where standard float fails: 19.99 * 3 = 59.970000000000006
      const lineTotal = calculateLineItem("19.99", "3");
      expect(lineTotal.toString()).toBe("59.97");
      expect(lineTotal.toNumber()).toBe(59.97);

      // Fractional hours: 7.75 hrs @ $125.40/hr = 971.85
      const hoursTotal = calculateLineItem(7.75, 125.4);
      expect(hoursTotal.toString()).toBe("971.85");
    });

    it("should round half-up for monetary values", () => {
      expect(roundMoney("10.005").toFixed(2)).toBe("10.01");
      expect(roundMoney("10.004").toFixed(2)).toBe("10.00");
      expect(roundMoney("10.0049").toFixed(2)).toBe("10.00");
    });

    it("should maintain 8 decimal precision for spot FX rates", () => {
      const fx = roundFx("278.405678912");
      expect(fx.toString()).toBe("278.40567891");
    });

    it("should calculate complete invoice totals with tax and base currency conversion (PKR)", () => {
      const items = [
        { quantity: 2, unitPrice: 50000 }, // 100,000
        { quantity: 1.5, unitPrice: 20000 }, // 30,000
      ];
      // Subtotal = 130,000, Tax = 16% (20,800), Total = 150,800 PKR
      const result = calculateInvoiceTotals(items, 16, "PKR");
      expect(result.subtotal).toBe(130000);
      expect(result.taxRate).toBe(16);
      expect(result.taxAmount).toBe(20800);
      expect(result.totalAmount).toBe(150800);
      expect(result.baseTotalAmount).toBe(150800);
      expect(result.exchangeRate).toBe(1.0);
    });

    it("should calculate multi-currency invoice totals normalized to base currency (USD -> PKR)", () => {
      const items = [
        { quantity: 10, unitPrice: 150 }, // $1,500
        { quantity: 5, unitPrice: 100 }, // $500
      ];
      // Subtotal = $2,000, Tax = 5% ($100), Total = $2,100
      // Spot rate = 278.40 => baseTotalAmount = 2100 * 278.40 = 584,640 PKR
      const result = calculateInvoiceTotals(items, 5, "USD", 278.4);
      expect(result.subtotal).toBe(2000);
      expect(result.taxAmount).toBe(100);
      expect(result.totalAmount).toBe(2100);
      expect(result.exchangeRate).toBe(278.4);
      expect(result.baseTotalAmount).toBe(584640);
    });

    it("should format currency symbols cleanly according to Claude Inkline standards", () => {
      expect(formatMoney(150800, "PKR")).toBe("₨ 150,800.00");
      expect(formatMoney(2100, "USD")).toBe("$ 2,100.00");
      expect(formatMoney(1850.5, "EUR")).toBe("€ 1,850.50");
      expect(formatMoney(4200, "AED")).toBe("AED 4,200.00");
      expect(formatMoney(2100, "USD", { showCode: true })).toBe("$ 2,100.00 (USD)");
    });

    it("should convert amounts accurately across foreign currencies via PKR pivot", () => {
      // 1000 USD to EUR:
      // 1000 * 278.4 = 278,400 PKR
      // 278,400 / 301.25 = 924.149377... => 924.15 EUR (round half-up)
      const converted = convertAmount(1000, "USD", "EUR");
      expect(converted.toFixed(2)).toBe("924.15");
    });
  });

  describe("Zod Validation Contracts (Step 3.2)", () => {
    it("should validate and normalize a valid invoice item", () => {
      const item = invoiceItemSchema.parse({
        description: "Cloud Architecture Audit & Hardening",
        quantity: "40",
        unitPrice: "125.50",
      });
      expect(item.description).toBe("Cloud Architecture Audit & Hardening");
      expect(item.quantity).toBe(40);
      expect(item.unitPrice).toBe(125.5);
    });

    it("should reject negative or zero quantities", () => {
      expect(() =>
        invoiceItemSchema.parse({
          description: "Test Item",
          quantity: 0,
          unitPrice: 100,
        })
      ).toThrow();

      expect(() =>
        invoiceItemSchema.parse({
          description: "Test Item",
          quantity: -5,
          unitPrice: 100,
        })
      ).toThrow();
    });

    it("should enforce dueDate >= issueDate constraint on invoice creation", () => {
      const valid = createInvoiceSchema.safeParse({
        clientId: "123e4567-e89b-12d3-a456-426614174000",
        currency: "USD",
        issueDate: "2026-11-20",
        dueDate: "2026-12-20",
        taxRate: 5,
        items: [{ description: "Consulting", quantity: 10, unitPrice: 100 }],
      });
      expect(valid.success).toBe(true);

      const invalid = createInvoiceSchema.safeParse({
        clientId: "123e4567-e89b-12d3-a456-426614174000",
        currency: "USD",
        issueDate: "2026-12-20",
        dueDate: "2026-11-20", // Before issue date!
        taxRate: 5,
        items: [{ description: "Consulting", quantity: 10, unitPrice: 100 }],
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0].message).toBe("Due date cannot be earlier than issue date");
      }
    });

    it("should validate payment recording inputs", () => {
      const payment = recordPaymentSchema.parse({
        invoiceId: "inv-test-123",
        paidAmount: "1500.50",
        notes: "Wire transfer ref #WT-8821",
      });
      expect(payment.invoiceId).toBe("inv-test-123");
      expect(payment.paidAmount).toBe(1500.5);
      expect(payment.notes).toBe("Wire transfer ref #WT-8821");
    });
  });
});
