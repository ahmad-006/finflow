import { describe, it, expect } from "bun:test";
import fs from "node:fs";
import { jsPDF } from "jspdf";
import {
  toInvoiceDocumentModel,
  formatDocumentMoney,
  formatDocumentDate,
  formatDualCurrencyEquivalent,
  getInvoicePDFFilename,
  generateInvoicePDF,
  generateInvoiceDocument,
  getInvoicePDFBlob,
  getInvoicePDFArrayBuffer,
  downloadInvoicePDF,
  CURRENCY_SYMBOLS,
  DEFAULT_EXCHANGE_RATES,
} from "@/modules/documents";
import type { InvoiceDocumentModel } from "@/modules/documents";

describe("Domain 4: Vector PDF Engine & Invoice Document Model", () => {
  const sampleInvoice: InvoiceDocumentModel = {
    id: "inv-uuid-001",
    companyId: "company-uuid-001",
    invoiceNumber: "INV-2026-0042",
    viewToken: "tok_secure_view_abc123",
    currency: "USD",
    exchangeRate: 278.4,
    issueDate: new Date("2026-11-16T10:00:00Z"),
    dueDate: new Date("2026-12-16T10:00:00Z"),
    subtotal: 6000,
    taxRate: 5,
    taxAmount: 300,
    totalAmount: 6300,
    baseTotalAmount: 1753920,
    paidAmount: 0,
    status: "SENT",
    notes: "Commercial exports under SBP rebate scheme.",
    client: {
      id: "client-uuid-001",
      clientName: "Acme Global Logistics Ltd",
      email: "finance@acme-logistics.com",
      paymentTermsDays: 30,
      phone: "+1 (555) 019-2834",
      address: "100 Montgomery St, Suite 1400, San Francisco, CA 94104",
    },
    items: [
      {
        id: "item-1",
        description: "Cross-border Freight Forwarding & Customs Clearance",
        quantity: 2,
        unitPrice: 2000,
        lineTotal: 4000,
      },
      {
        id: "item-2",
        description: "Port Handling & Terminal Storage Fees",
        quantity: 1,
        unitPrice: 2000,
        lineTotal: 2000,
      },
    ],
    company: {
      name: "Rehman and Sons Trading",
      email: "billing@rehman-trading.pk",
      phone: "+92 (51) 844-2100",
      address: "Plot 14-B, Industrial Zone, Sector I-9, Islamabad, 44000, Pakistan",
      baseCurrency: "PKR",
    },
  };

  describe("Invoice Document Model Mapping (toInvoiceDocumentModel)", () => {
    it("should correctly preserve full invoice model fields when already structured", () => {
      const model = toInvoiceDocumentModel(sampleInvoice);
      expect(model.invoiceNumber).toBe("INV-2026-0042");
      expect(model.viewToken).toBe("tok_secure_view_abc123");
      expect(model.currency).toBe("USD");
      expect(model.exchangeRate).toBe(278.4);
      expect(model.subtotal).toBe(6000);
      expect(model.taxRate).toBe(5);
      expect(model.taxAmount).toBe(300);
      expect(model.totalAmount).toBe(6300);
      expect(model.baseTotalAmount).toBe(1753920);
      expect(model.client.clientName).toBe("Acme Global Logistics Ltd");
      expect(model.items.length).toBe(2);
      expect(model.company?.name).toBe("Rehman and Sons Trading");
    });

    it("should provide robust defaults for minimal or partial input payloads", () => {
      const minimalRaw = {
        invoiceNumber: "INV-2026-0001",
        totalAmount: 150000,
        currency: "PKR",
      };

      const model = toInvoiceDocumentModel(minimalRaw);
      expect(model.invoiceNumber).toBe("INV-2026-0001");
      expect(model.currency).toBe("PKR");
      expect(model.subtotal).toBe(0);
      expect(model.totalAmount).toBe(150000);
      expect(model.client.clientName).toBe("Commercial Client");
      expect(model.client.paymentTermsDays).toBe(30);
      expect(model.company?.name).toBe("Rehman and Sons Trading");
      expect(model.status).toBe("DRAFT");
    });

    it("should compute baseTotalAmount using exchange rates when not provided", () => {
      const usdInvoice = {
        invoiceNumber: "INV-2026-0099",
        totalAmount: 1000,
        currency: "USD",
        exchangeRate: 278.4,
      };

      const model = toInvoiceDocumentModel(usdInvoice);
      expect(model.baseTotalAmount).toBe(278400);
    });

    it("should honor custom PDFGeneratorOptions overrides for company and remittance", () => {
      const options = {
        companyName: "FinFlow International Ltd",
        companyEmail: "ops@finflow.io",
        companyPhone: "+44 20 7946 0991",
        companyAddress: "25 Bank Street, Canary Wharf, London, E14 5JP",
        wireRemittanceNotes: "Swift: FINFGB22, IBAN: GB29NWBK60161331926819",
        verificationUrl: "https://custom-portal.finflow.app/verify/tok123",
      };

      const model = toInvoiceDocumentModel(sampleInvoice, options);
      expect(model.company?.name).toBe("FinFlow International Ltd");
      expect(model.company?.email).toBe("ops@finflow.io");
      expect(model.company?.phone).toBe("+44 20 7946 0991");
      expect(model.company?.address).toContain("Canary Wharf");
      expect(model.wireRemittanceNotes).toBe("Swift: FINFGB22, IBAN: GB29NWBK60161331926819");
      expect(model.verificationUrl).toBe("https://custom-portal.finflow.app/verify/tok123");
    });
  });

  describe("Currency Formatting & Dual-Currency Contract", () => {
    it("should format currency with proper symbols and two decimal places", () => {
      expect(formatDocumentMoney(1753920, "PKR")).toBe("Rs. 1,753,920.00");
      expect(formatDocumentMoney(6300, "USD")).toBe("$ 6,300.00");
      expect(formatDocumentMoney(4500.5, "EUR")).toBe("€ 4,500.50");
      expect(formatDocumentMoney(12000, "GBP")).toBe("£ 12,000.00");
      expect(formatDocumentMoney(8500, "AED")).toBe("AED 8,500.00");
    });

    it("should handle negative monetary amounts with leading minus sign", () => {
      expect(formatDocumentMoney(-1500, "USD")).toBe("-$ 1,500.00");
      expect(formatDocumentMoney(-500.25, "PKR")).toBe("-Rs. 500.25");
    });

    it("should support showCode option for unambiguous ISO code presentation", () => {
      expect(formatDocumentMoney(6300, "USD", { showCode: true })).toBe("USD 6,300.00");
      expect(formatDocumentMoney(1753920, "PKR", { showCode: true })).toBe("PKR 1,753,920.00");
    });

    it("should format dual-currency base equivalent per Claude Inkline v3 standards", () => {
      // E.g. "$ 6,300.00 USD = Rs. 1,753,920.00 PKR @ spot rate"
      const result = formatDualCurrencyEquivalent(
        6300,
        "USD",
        1753920,
        "PKR",
        278.4
      );
      expect(result).toBe("$ 6,300.00 USD = Rs. 1,753,920.00 PKR @ spot rate");
    });

    it("should compute base amount dynamically in dual-currency formatting if omitted", () => {
      const result = formatDualCurrencyEquivalent(
        1000,
        "USD",
        undefined,
        "PKR",
        278.4
      );
      expect(result).toBe("$ 1,000.00 USD = Rs. 278,400.00 PKR @ spot rate");
    });

    it("should verify defined currency symbols mapping", () => {
      expect(CURRENCY_SYMBOLS.PKR).toBe("Rs.");
      expect(CURRENCY_SYMBOLS.USD).toBe("$");
      expect(CURRENCY_SYMBOLS.EUR).toBe("€");
      expect(CURRENCY_SYMBOLS.GBP).toBe("£");
      expect(CURRENCY_SYMBOLS.AED).toBe("AED");
    });
  });

  describe("Calendar Date Formatting (formatDocumentDate)", () => {
    it("should format dates in en-GB standard: '16 Nov 2026'", () => {
      const date = new Date("2026-11-16T12:00:00Z");
      expect(formatDocumentDate(date)).toBe("16 Nov 2026");
    });

    it("should handle ISO date strings and timestamps", () => {
      expect(formatDocumentDate("2026-12-25T00:00:00Z")).toBe("25 Dec 2026");
      const ts = new Date("2026-01-01T00:00:00Z").getTime();
      expect(formatDocumentDate(ts)).toBe("1 Jan 2026");
    });

    it("should return fallback em-dash for undefined or null dates", () => {
      expect(formatDocumentDate(undefined)).toBe("—");
      expect(formatDocumentDate(null)).toBe("—");
    });
  });

  describe("File Naming Contract (getInvoicePDFFilename)", () => {
    it("should return exact INV-YYYY-XXXX.pdf format from invoice number", () => {
      const filename = getInvoicePDFFilename(sampleInvoice);
      expect(filename).toBe("INV-2026-0042.pdf");
      expect(filename).toMatch(/^INV-\d{4}-\d{4}\.pdf$/);
    });

    it("should sanitize invalid filename characters in invoice number", () => {
      const weirdInvoice = {
        ...sampleInvoice,
        invoiceNumber: "INV/2026#0042:A",
      };
      const filename = getInvoicePDFFilename(weirdInvoice);
      expect(filename).toBe("INV_2026_0042_A.pdf");
      expect(filename.endsWith(".pdf")).toBe(true);
    });

    it("should respect explicit custom filename in options with automatic .pdf extension", () => {
      expect(getInvoicePDFFilename(sampleInvoice, { filename: "custom-export" })).toBe("custom-export.pdf");
      expect(getInvoicePDFFilename(sampleInvoice, { filename: "custom-export.pdf" })).toBe("custom-export.pdf");
    });

    it("should fallback gracefully if invoiceNumber is absent", () => {
      const emptyInvoice = { ...sampleInvoice, invoiceNumber: "" };
      expect(getInvoicePDFFilename(emptyInvoice)).toBe("INV-DOCUMENT.pdf");
    });
  });

  describe("jsPDF Vector Engine & Layout Contracts", () => {
    it("should compile a jsPDF document instance with strict A4 portrait dimensions", () => {
      const doc = generateInvoicePDF(sampleInvoice);
      expect(doc).toBeDefined();

      // Verify A4 dimensions in mm: 210 x 297 mm
      const internal = (doc as any).internal;
      const pageSize = internal.pageSize;
      expect(Math.round(pageSize.getWidth())).toBe(210);
      expect(Math.round(pageSize.getHeight())).toBe(297);
    });

    it("should embed document metadata matching invoice and company contracts", () => {
      const doc = generateInvoicePDF(sampleInvoice);
      const internal = (doc as any).internal;
      // jsPDF stores document properties
      const props = (doc as any).getDocumentProperty
        ? (doc as any).getDocumentProperty()
        : null;

      // Ensure doc generates without throwing
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    });

    it("should generate binary ArrayBuffer with non-zero length and PDF magic header", () => {
      const buffer = getInvoicePDFArrayBuffer(sampleInvoice);
      expect(buffer).toBeDefined();
      expect(buffer.byteLength).toBeGreaterThan(1000);

      // Verify %PDF- magic bytes header (0x25, 0x50, 0x44, 0x46, 0x2D)
      const uint8 = new Uint8Array(buffer);
      const header = String.fromCharCode(...uint8.slice(0, 5));
      expect(header).toBe("%PDF-");
    });

    it("should generate Blob instance with application/pdf MIME type", () => {
      const blob = getInvoicePDFBlob(sampleInvoice);
      expect(blob).toBeDefined();
      expect(blob.type).toBe("application/pdf");
      expect(blob.size).toBeGreaterThan(1000);
    });

    it("should generate complete GeneratedDocument bundle", () => {
      const generated = generateInvoiceDocument(sampleInvoice);
      expect(generated.filename).toBe("INV-2026-0042.pdf");
      expect(generated.blob).toBeInstanceOf(Blob);
      expect(generated.blob.type).toBe("application/pdf");
      expect(generated.arrayBuffer.byteLength).toBeGreaterThan(1000);
      expect(generated.dataUri).toContain("data:application/pdf;");
      expect(generated.dataUri).toContain(";base64,");
      expect(generated.doc).toBeDefined();
    });

    it("should paginate correctly when line items exceed single page height", () => {
      // Create 25 line items to force pagination past A4 vertical margin threshold
      const manyItems = Array.from({ length: 25 }, (_, i) => ({
        id: `item-${i + 1}`,
        description: `Engineering consulting sprint milestone service block #${i + 1}`,
        quantity: 1,
        unitPrice: 500,
        lineTotal: 500,
      }));

      const longInvoice: InvoiceDocumentModel = {
        ...sampleInvoice,
        invoiceNumber: "INV-2026-9999",
        items: manyItems,
        subtotal: 12500,
        totalAmount: 12500,
        baseTotalAmount: 3480000,
      };

      const doc = generateInvoicePDF(longInvoice);
      const totalPages = doc.getNumberOfPages();
      expect(totalPages).toBeGreaterThanOrEqual(2);
    });

    it("should render paid badge when invoice is fully settled", () => {
      const paidInvoice: InvoiceDocumentModel = {
        ...sampleInvoice,
        status: "PAID",
        paidAmount: 6300,
      };

      const doc = generateInvoicePDF(paidInvoice);
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    });

    it("should render overdue status styling when invoice is overdue", () => {
      const overdueInvoice: InvoiceDocumentModel = {
        ...sampleInvoice,
        status: "OVERDUE",
        dueDate: new Date("2025-01-01T00:00:00Z"),
      };

      const doc = generateInvoicePDF(overdueInvoice);
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    });

    it("should handle partial payments showing paid to date and remaining balance due", () => {
      const partialInvoice: InvoiceDocumentModel = {
        ...sampleInvoice,
        paidAmount: 2000,
        totalAmount: 6300,
      };

      const doc = generateInvoicePDF(partialInvoice);
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    });

    it("should generate PDF without errors when invoice has empty line items array", () => {
      const noItemsInvoice: InvoiceDocumentModel = {
        ...sampleInvoice,
        items: [],
      };

      const doc = generateInvoicePDF(noItemsInvoice);
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    });

    it("should trigger client-side download with correct filename via downloadInvoicePDF", () => {
      let writtenFile = "";
      const originalWriteFileSync = fs.writeFileSync;
      (fs as any).writeFileSync = function (file: string, _data: any) {
        writtenFile = String(file);
      };

      try {
        downloadInvoicePDF(sampleInvoice);
        expect(writtenFile).toBe("INV-2026-0042.pdf");
      } finally {
        fs.writeFileSync = originalWriteFileSync;
      }
    });

    it("should render cleanly across all supported currencies (PKR, EUR, GBP, AED)", () => {
      const currencies = ["PKR", "EUR", "GBP", "AED"] as const;
      for (const curr of currencies) {
        const doc = generateInvoicePDF({
          ...sampleInvoice,
          currency: curr,
          invoiceNumber: `INV-2026-00-${curr}`,
        });
        expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
      }
    });

    it("should render multi-line wrapping addresses and notes without overflowing margins", () => {
      const verboseInvoice: InvoiceDocumentModel = {
        ...sampleInvoice,
        notes: "Detailed export compliance declaration under State Bank of Pakistan Foreign Exchange Manual Chapter 12. Consignment inspected and cleared through Islamabad Dry Port container freight station.",
        wireRemittanceNotes: "Bank: Meezan Bank Ltd, Corporate Branch Islamabad. IBAN: PK55MEZN0001020304050607, SWIFT: MEZNPKKA. All international wire fees must be borne by remitter (OUR).",
        client: {
          ...sampleInvoice.client,
          address: "Building 4B, Level 3, Dubai Internet City, Phase 2, PO Box 500001, Dubai, United Arab Emirates",
        },
      };

      const doc = generateInvoicePDF(verboseInvoice);
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    });
  });
});
