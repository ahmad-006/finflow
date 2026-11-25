import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "@/lib/db";
import {
  CSV_MAX_BYTES,
  CSV_MAX_ROWS,
  normalizeCsvHeader,
  parseCsv,
  pickCsvField,
  generateCsv,
} from "@/lib/csv";
import { parsePaymentTerms, bulkClientRowSchema } from "@/modules/clients/validation";
import {
  calculateClientMetrics,
  getClients,
  getClientById,
  getARAgingBuckets,
  bulkImportClients,
} from "@/modules/clients/service";
import {
  createClientAction,
  updateClientAction,
  deleteClientAction,
  bulkImportClientsAction,
} from "@/modules/clients/actions";
import { calculateInvoiceTotals } from "@/modules/invoices/currency";
import { bulkInvoiceRowSchema } from "@/modules/invoices/validation";
import {
  createInvoice,
  recordInvoicePayment,
  bulkImportInvoices,
} from "@/modules/invoices/service";
import {
  updateInvoiceAction,
  markInvoiceSentAction,
  cancelInvoiceAction,
  bulkImportInvoicesAction,
} from "@/modules/invoices/actions";
import {
  parseExpenseCategory,
  parseExpenseRecurrence,
} from "@/modules/expenses/validation";
import { createExpense, bulkImportExpenses } from "@/modules/expenses/service";
import {
  updateExpenseAction,
  deleteExpenseAction,
  bulkImportExpensesAction,
} from "@/modules/expenses/actions";
import { updateTreasurySettingsAction } from "@/modules/treasury/actions";
import type { SessionPayload } from "@/modules/auth/types";

describe("CSV Parsing, Bulk Imports, FX Regression & RBAC Guards", () => {
  const createdCompanyIds: string[] = [];
  const ts = Date.now();

  let companyPkrId = "";
  let companyUsdId = "";
  let ownerUserId = "";

  function makeSession(role: string, companyId: string, userId = ownerUserId): SessionPayload {
    return {
      userId,
      companyId,
      email: `${role.toLowerCase()}-${ts}@csv-test.pk`,
      fullName: `${role} User`,
      role,
      emailVerified: true,
      onboardingCompleted: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    };
  }

  beforeAll(async () => {
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await db.$queryRaw`SELECT 1`;
        break;
      } catch (err) {
        if (attempt === 4) throw err;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    const compPkr = await db.company.create({
      data: {
        name: `CSV Test PKR ${ts}`,
        baseCurrency: "PKR",
        liquidReserve: 500000,
        safetyBuffer: 50000,
      },
    });
    companyPkrId = compPkr.id;
    createdCompanyIds.push(compPkr.id);

    const owner = await db.user.create({
      data: {
        companyId: compPkr.id,
        email: `owner-${ts}@csv-test.pk`,
        fullName: "Test Owner",
        role: "OWNER",
        emailVerified: true,
      },
    });
    ownerUserId = owner.id;

    const compUsd = await db.company.create({
      data: {
        name: `CSV Test USD ${ts}`,
        baseCurrency: "USD",
        liquidReserve: 25000,
        safetyBuffer: 5000,
      },
    });
    companyUsdId = compUsd.id;
    createdCompanyIds.push(compUsd.id);
  }, 40000);

  afterAll(async () => {
    for (const companyId of createdCompanyIds) {
      try {
        await db.transaction.deleteMany({ where: { companyId } });
        await db.invoiceItem.deleteMany({ where: { companyId } });
        await db.invoice.deleteMany({ where: { companyId } });
        await db.expense.deleteMany({ where: { companyId } });
        await db.client.deleteMany({ where: { companyId } });
        await db.auditLog.deleteMany({ where: { companyId } });
        await db.user.deleteMany({ where: { companyId } });
        await db.company.delete({ where: { id: companyId } });
      } catch {
        // Ignore already-deleted company
      }
    }
  }, 40000);

  // =========================================================================
  // 1. Contract A: src/lib/csv.ts
  // =========================================================================
  describe("Contract A: CSV Parsing & Generation", () => {
    it("normalizes headers by trimming, lowercasing, and stripping spaces/underscores/hyphens", () => {
      expect(normalizeCsvHeader("  Client_Name  ")).toBe("clientname");
      expect(normalizeCsvHeader("payment-terms-days")).toBe("paymenttermsdays");
      expect(normalizeCsvHeader("Client Email")).toBe("clientemail");
    });

    it("parses UTF-8 BOM, CRLF/LF/CR, quoted commas/newlines, escaped quotes, and skips blank lines", () => {
      const csvText =
        "\uFEFF" +
        'Client Name,Email,"Address, Full",Notes\r\n' +
        "\r\n" +
        '"Zara Textiles, Ltd.",billing@zaratextiles.pk,"Plot 14\nSITE Area","He said ""Confirmed"""\r' +
        "   \n" +
        "Indus Freight,accounts@indusfreight.pk,Karachi,Standard";

      const result = parseCsv(csvText);
      expect(result.error).toBeUndefined();
      expect(result.headers).toEqual(["Client Name", "Email", "Address, Full", "Notes"]);
      expect(result.rows.length).toBe(2);

      expect(result.rows[0].rowNumber).toBe(3);
      expect(result.rows[0].raw["Client Name"]).toBe("Zara Textiles, Ltd.");
      expect(result.rows[0].raw["Address, Full"]).toBe("Plot 14\nSITE Area");
      expect(result.rows[0].raw["Notes"]).toBe('He said "Confirmed"');
      expect(pickCsvField(result.rows[0], ["client_name", "name"])).toBe("Zara Textiles, Ltd.");

      expect(result.rows[1].rowNumber).toBe(6);
      expect(pickCsvField(result.rows[1], ["client-name", "Client Name"])).toBe("Indus Freight");
    });

    it("assigns header=1 and first data row=2 when there are no leading blank lines", () => {
      const res = parseCsv("name,email\nAlpha Tech,alpha@tech.pk");
      expect(res.error).toBeUndefined();
      expect(res.rows[0].rowNumber).toBe(2);
    });

    it("returns clear errors on unclosed quotes, empty input, header-only input, and >CSV_MAX_ROWS", () => {
      expect(parseCsv("").error).toBeDefined();
      expect(parseCsv("   \n  ").error).toBeDefined();
      expect(parseCsv("name,email\n").error).toBeDefined();
      expect(parseCsv('name,email\n"Unclosed,a@b.com').error).toContain("unclosed");

      const lines = ["name,email"];
      for (let i = 0; i <= CSV_MAX_ROWS; i++) {
        lines.push(`Client ${i},c${i}@test.pk`);
      }
      const tooMany = parseCsv(lines.join("\n"));
      expect(tooMany.error).toContain(String(CSV_MAX_ROWS));
      expect(CSV_MAX_BYTES).toBe(2 * 1024 * 1024);
    });

    it("escapes RFC 4180 cells and neutralizes formula injection while preserving negatives and +92 phone numbers", () => {
      const csv = generateCsv(
        ["name", "formula", "at", "plusCmd", "minusCmd", "negative", "phone", "comma"],
        [
          [
            "Safe Co",
            "=CMD()",
            "@SUM(1,2)",
            "+1+1",
            "-1+1",
            "-125.50",
            "+92 300 1234567",
            'A, "B"',
          ],
        ]
      );

      const parsed = parseCsv(csv);
      expect(parsed.error).toBeUndefined();
      const row = parsed.rows[0].raw;
      expect(row.formula).toBe("'=CMD()");
      expect(row.at).toBe("'@SUM(1,2)");
      expect(row.plusCmd).toBe("'+1+1");
      expect(row.minusCmd).toBe("'-1+1");
      expect(row.negative).toBe("-125.50");
      expect(row.phone).toBe("+92 300 1234567");
      expect(row.comma).toBe('A, "B"');
    });
  });

  // =========================================================================
  // 2. Contract B: Clients Bulk Import & Terms Normalization
  // =========================================================================
  describe("Contract B: Clients Bulk Import & Terms Normalization", () => {
    it("normalizes payment terms variants via parsePaymentTerms", () => {
      expect(parsePaymentTerms("Net 30")).toBe(30);
      expect(parsePaymentTerms("net-15")).toBe(15);
      expect(parsePaymentTerms("60 days")).toBe(60);
      expect(parsePaymentTerms("45")).toBe(45);
      expect(parsePaymentTerms(90)).toBe(90);
      expect(parsePaymentTerms("")).toBe(30);
      expect(parsePaymentTerms(undefined)).toBe(30);

      expect(bulkClientRowSchema.safeParse({
        clientName: "Bad Terms Co",
        email: "bad@terms.pk",
        paymentTermsDays: "Net 12",
      }).success).toBe(false);
    });

    it("imports valid rows, flags in-CSV duplicates, handles DB skip vs fail, and isolates tenants", async () => {
      await expect(bulkImportClients(companyPkrId, [])).rejects.toThrow();

      const tooMany = Array.from({ length: 501 }, (_, idx) => ({
        clientName: `Bulk ${idx}`,
        email: `b${idx}@bulk.pk`,
      }));
      await expect(bulkImportClients(companyPkrId, tooMany)).rejects.toThrow();

      const firstBatch = await bulkImportClients(
        companyPkrId,
        [
          {
            rowNumber: 2,
            clientName: "Lahore Knitwear",
            email: "Billing@LahoreKnitwear.pk",
            phone: "+92 300 1112233",
            paymentTermsDays: "Net 45",
          },
          {
            rowNumber: 3,
            clientName: "Lahore Knitwear Duplicate",
            email: "billing@lahoreknitwear.pk",
            paymentTermsDays: "30 days",
          },
          {
            rowNumber: 4,
            clientName: "Sialkot Sports",
            email: "accounts@sialkotsports.pk",
            paymentTermsDays: "",
          },
          {
            rowNumber: 5,
            clientName: "X",
            email: "invalid-email",
          },
        ],
        { duplicateMode: "skip" },
        ownerUserId
      );

      expect(firstBatch.createdCount).toBe(2);
      expect(firstBatch.skippedCount).toBe(0);
      expect(firstBatch.failedCount).toBe(2);
      expect(firstBatch.createdClients.map((c) => c.paymentTermsDays)).toEqual([45, 30]);

      const audit = await db.auditLog.findFirst({
        where: { companyId: companyPkrId, entityType: "CLIENT", action: "CREATE" },
        orderBy: { timestamp: "desc" },
      });
      expect(audit).not.toBeNull();

      // DB duplicate skip mode
      const skipRes = await bulkImportClients(
        companyPkrId,
        [
          { rowNumber: 2, clientName: "Lahore Knitwear", email: "billing@lahoreknitwear.pk" },
          { rowNumber: 3, clientName: "Multan Ceramics", email: "ar@multanceramics.pk", paymentTermsDays: "60 days" },
        ],
        { duplicateMode: "skip" },
        ownerUserId
      );
      expect(skipRes.createdCount).toBe(1);
      expect(skipRes.skippedCount).toBe(1);
      expect(skipRes.failedCount).toBe(0);

      // DB duplicate fail mode
      const failRes = await bulkImportClients(
        companyPkrId,
        [{ rowNumber: 2, clientName: "Lahore Knitwear", email: "billing@lahoreknitwear.pk" }],
        { duplicateMode: "fail" },
        ownerUserId
      );
      expect(failRes.createdCount).toBe(0);
      expect(failRes.failedCount).toBe(1);
      expect(failRes.errors[0].message).toContain("already exists");

      // Tenant isolation: Company USD can import same email independently
      const crossTenant = await bulkImportClients(companyUsdId, [
        { rowNumber: 2, clientName: "Lahore Knitwear US", email: "billing@lahoreknitwear.pk" },
      ]);
      expect(crossTenant.createdCount).toBe(1);
    }, 30000);
  });

  // =========================================================================
  // 3. Contract C: Invoices Multi-Currency & Bulk Import
  // =========================================================================
  describe("Contract C: Invoices Multi-Currency & Bulk Import", () => {
    it("uses fxRate = 1.0 when invoice currency equals non-PKR baseCurrency", () => {
      const calc = calculateInvoiceTotals(
        [{ quantity: 2, unitPrice: 500 }],
        10,
        "USD",
        278.4,
        "USD"
      );
      expect(calc.exchangeRate).toBe(1.0);
      expect(calc.totalAmount).toBe(1100);
      expect(calc.baseTotalAmount).toBe(1100);

      const fxCalc = calculateInvoiceTotals(
        [{ quantity: 1, unitPrice: 1000 }],
        0,
        "EUR",
        1.08,
        "USD"
      );
      expect(fxCalc.exchangeRate).toBe(1.08);
      expect(fxCalc.baseTotalAmount).toBe(1080);
    });

    it("rejects PAID/CANCELLED/OVERDUE statuses in bulkInvoiceRowSchema", () => {
      for (const badStatus of ["PAID", "CANCELLED", "OVERDUE"]) {
        const res = bulkInvoiceRowSchema.safeParse({
          clientEmail: "billing@lahoreknitwear.pk",
          issueDate: "2026-05-01",
          status: badStatus,
          description: "Service",
          unitPrice: 100,
        });
        expect(res.success).toBe(false);
      }
    });

    it("imports single and grouped multi-line invoices, sequential INV-YYYY-XXXX, auto-creates clients, and enforces tenant isolation", async () => {
      const pastIssue = "2025-01-10";
      const pastDue = "2025-02-01";
      const futureDue = "2030-12-31";

      const result = await bulkImportInvoices(
        companyPkrId,
        [
          // Grouped 2-line invoice in 2026
          {
            rowNumber: 2,
            invoiceGroup: "GRP-ALPHA",
            clientEmail: "billing@lahoreknitwear.pk",
            currency: "PKR",
            issueDate: "2026-06-01",
            dueDate: futureDue,
            taxRate: 16,
            status: "SENT",
            description: "Backend API Architecture",
            quantity: 10,
            unitPrice: 10000,
            notes: "Phase 1 milestone",
          },
          {
            rowNumber: 3,
            invoiceGroup: "grp-alpha",
            clientEmail: "billing@lahoreknitwear.pk",
            issueDate: "2026-06-01",
            description: "QA Verification",
            quantity: 5,
            unitPrice: 4000,
          },
          // Single-line invoice in 2025 with SENT past due -> OVERDUE
          {
            rowNumber: 4,
            clientEmail: "accounts@sialkotsports.pk",
            issueDate: pastIssue,
            dueDate: pastDue,
            status: "SENT",
            description: "Legacy Support",
            quantity: 1,
            unitPrice: 50000,
          },
          // Mixed clientEmail in group -> error
          {
            rowNumber: 5,
            invoiceGroup: "BAD-MIX",
            clientEmail: "billing@lahoreknitwear.pk",
            issueDate: "2026-06-05",
            description: "Item A",
            unitPrice: 100,
          },
          {
            rowNumber: 6,
            invoiceGroup: "BAD-MIX",
            clientEmail: "accounts@sialkotsports.pk",
            issueDate: "2026-06-05",
            description: "Item B",
            unitPrice: 100,
          },
          // Missing client without autoCreateMissingClients -> error
          {
            rowNumber: 7,
            clientEmail: "unknown-client@nowhere.pk",
            clientName: "Unknown Co",
            issueDate: "2026-06-05",
            description: "Item C",
            unitPrice: 100,
          },
          // Invalid status PAID -> error
          {
            rowNumber: 8,
            clientEmail: "billing@lahoreknitwear.pk",
            issueDate: "2026-06-05",
            status: "PAID",
            description: "Already paid",
            unitPrice: 100,
          },
          // dueDate < issueDate -> error
          {
            rowNumber: 9,
            clientEmail: "billing@lahoreknitwear.pk",
            issueDate: "2026-06-15",
            dueDate: "2026-06-01",
            description: "Invalid dates",
            unitPrice: 100,
          },
        ],
        { autoCreateMissingClients: false },
        ownerUserId
      );

      expect(result.createdCount).toBe(2);
      expect(result.autoCreatedClientsCount).toBe(0);
      expect(result.failedCount).toBe(4);

      const groupedInv = result.createdInvoices[0];
      expect(groupedInv.invoiceNumber).toBe("INV-2026-0001");
      expect(groupedInv.items.length).toBe(2);
      expect(groupedInv.subtotal).toBe(120000);
      expect(groupedInv.taxAmount).toBe(19200);
      expect(groupedInv.totalAmount).toBe(139200);
      expect(groupedInv.status).toBe("SENT");
      expect(groupedInv.notes).toBe("Phase 1 milestone");

      const overdueInv = result.createdInvoices[1];
      expect(overdueInv.invoiceNumber).toBe("INV-2025-0001");
      expect(overdueInv.status).toBe("OVERDUE");

      // Second import continues sequential INV-2026-0002 and auto-creates missing client once
      const autoRes = await bulkImportInvoices(
        companyPkrId,
        [
          {
            rowNumber: 2,
            clientEmail: "newvendor@karachitech.pk",
            clientName: "Karachi Tech Solutions",
            issueDate: "2026-07-01",
            description: "Retainer July",
            quantity: 1,
            unitPrice: 75000,
          },
          {
            rowNumber: 3,
            clientEmail: "newvendor@karachitech.pk",
            issueDate: "2026-08-01",
            description: "Retainer August",
            quantity: 1,
            unitPrice: 75000,
          },
        ],
        { autoCreateMissingClients: true },
        ownerUserId
      );

      expect(autoRes.createdCount).toBe(2);
      expect(autoRes.autoCreatedClientsCount).toBe(1);
      expect(autoRes.createdInvoices[0].invoiceNumber).toBe("INV-2026-0002");
      expect(autoRes.createdInvoices[1].invoiceNumber).toBe("INV-2026-0003");

      // Non-PKR baseCurrency company (USD)
      const usdRes = await bulkImportInvoices(
        companyUsdId,
        [
          {
            rowNumber: 2,
            clientEmail: "billing@lahoreknitwear.pk", // Exists in USD company from earlier test
            issueDate: "2026-07-10",
            description: "US Advisory",
            quantity: 4,
            unitPrice: 250,
          },
        ],
        { autoCreateMissingClients: false }
      );
      expect(usdRes.createdCount).toBe(1);
      expect(usdRes.createdInvoices[0].currency).toBe("USD");
      expect(usdRes.createdInvoices[0].exchangeRate).toBe(1);
      expect(usdRes.createdInvoices[0].totalAmount).toBe(1000);
      expect(usdRes.createdInvoices[0].baseTotalAmount).toBe(1000);
    }, 35000);
  });

  // =========================================================================
  // 4. Foreign-currency paidAmount regression in Client Metrics & AR Aging
  // =========================================================================
  describe("Foreign-Currency paidAmount Regression", () => {
    it("computes basePaid proportionally in calculateClientMetrics", () => {
      const dueFuture = new Date(Date.now() + 10 * 86400000);
      const metrics = calculateClientMetrics([
        {
          id: "fx-partial",
          status: "SENT",
          dueDate: dueFuture,
          paidAt: null,
          totalAmount: 1000,
          baseTotalAmount: 278400,
          paidAmount: 500, // $500 of $1,000 paid => 139,200 PKR paid
        },
        {
          id: "fx-full",
          status: "PAID",
          dueDate: dueFuture,
          paidAt: new Date(),
          totalAmount: 200,
          baseTotalAmount: 55680,
          paidAmount: 200, // $200 of $200 paid => 55,680 PKR paid
        },
      ]);

      expect(metrics.totalBilled).toBe(334080);
      expect(metrics.totalPaid).toBe(194880);
      expect(metrics.outstandingBalance).toBe(139200);
      expect(metrics.settledInvoicesCount).toBe(1);
      expect(metrics.openInvoicesCount).toBe(1);
    });

    it("computes basePaid accurately across getClients, getClientById, and getARAgingBuckets", async () => {
      const comp = await db.company.create({
        data: { name: `FX Regression Co ${ts}`, baseCurrency: "PKR" },
      });
      createdCompanyIds.push(comp.id);

      const client = await db.client.create({
        data: {
          companyId: comp.id,
          clientName: "Global FX Client",
          email: `fx-${ts}@global.com`,
          paymentTermsDays: 30,
        },
      });

      const inv = await createInvoice(comp.id, {
        clientId: client.id,
        currency: "USD",
        exchangeRate: 280,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 15 * 86400000),
        taxRate: 0,
        items: [{ description: "USD Consulting", quantity: 10, unitPrice: 100 }], // $1,000 => 280,000 PKR
      });

      // Record $250 partial payment => 250 / 1000 * 280,000 = 70,000 PKR paid; 210,000 PKR remaining
      await recordInvoicePayment(comp.id, {
        invoiceId: inv.id,
        paidAmount: 250,
      });

      const list = await getClients(comp.id);
      expect(list[0].metrics.totalBilled).toBe(280000);
      expect(list[0].metrics.totalPaid).toBe(70000);
      expect(list[0].metrics.outstandingBalance).toBe(210000);

      const detail = await getClientById(comp.id, client.id);
      expect(detail?.metrics.totalPaid).toBe(70000);
      expect(detail?.metrics.outstandingBalance).toBe(210000);

      const aging = await getARAgingBuckets(comp.id);
      expect(aging.totalOutstanding).toBe(210000);
      expect(aging.current).toBe(210000);
    }, 30000);
  });

  // =========================================================================
  // 5. RBAC Guards on Client, Invoice, Expense & Treasury Actions
  // =========================================================================
  describe("RBAC Action Guards", () => {
    it("blocks VIEWER from mutating clients, invoices, and expenses, and restricts treasury settings to OWNER", async () => {
      const viewerSession = makeSession("VIEWER", companyPkrId);
      const memberSession = makeSession("MEMBER", companyPkrId);
      const adminSession = makeSession("ADMIN", companyPkrId);
      const ownerSession = makeSession("OWNER", companyPkrId);

      // Client actions: VIEWER blocked
      const c1 = await createClientAction(
        { clientName: "Denied Client", email: "denied@test.pk" },
        undefined,
        viewerSession
      );
      expect(c1.success).toBe(false);
      expect(c1.error).toContain("Forbidden");

      const c2 = await updateClientAction(
        { id: crypto.randomUUID(), clientName: "Denied Update" },
        undefined,
        viewerSession
      );
      expect(c2.success).toBe(false);
      expect(c2.error).toContain("Forbidden");

      const c3 = await deleteClientAction(crypto.randomUUID(), viewerSession);
      expect(c3.success).toBe(false);
      expect(c3.error).toContain("Forbidden");

      const c4 = await bulkImportClientsAction(
        [{ clientName: "Denied Bulk", email: "denied-bulk@test.pk" }],
        undefined,
        viewerSession
      );
      expect(c4.success).toBe(false);
      expect(c4.error).toContain("Forbidden");

      // Invoice actions: VIEWER blocked
      const i1 = await updateInvoiceAction(
        { id: crypto.randomUUID(), notes: "Denied" },
        viewerSession
      );
      expect(i1.success).toBe(false);
      expect(i1.error).toContain("Forbidden");

      const i2 = await markInvoiceSentAction(crypto.randomUUID(), viewerSession);
      expect(i2.success).toBe(false);
      expect(i2.error).toContain("Forbidden");

      const i3 = await cancelInvoiceAction(crypto.randomUUID(), viewerSession);
      expect(i3.success).toBe(false);
      expect(i3.error).toContain("Forbidden");

      const i4 = await bulkImportInvoicesAction(
        [
          {
            clientEmail: "billing@lahoreknitwear.pk",
            issueDate: "2026-07-01",
            description: "Denied",
            unitPrice: 100,
          },
        ],
        undefined,
        viewerSession
      );
      expect(i4.success).toBe(false);
      expect(i4.error).toContain("Forbidden");

      // Expense actions: create real expense, verify VIEWER blocked & MEMBER allowed
      const expense = await createExpense(companyPkrId, {
        title: "RBAC Test Expense",
        category: "SOFTWARE",
        amount: 5000,
        dueDate: new Date("2026-08-01"),
        recurrence: "NONE",
      });

      const eViewerUpd = await updateExpenseAction(
        expense.id,
        { id: expense.id, title: "Nope" },
        viewerSession
      );
      expect(eViewerUpd.success).toBe(false);
      expect(eViewerUpd.error).toContain("Forbidden");

      const eViewerDel = await deleteExpenseAction(expense.id, viewerSession);
      expect(eViewerDel.success).toBe(false);
      expect(eViewerDel.error).toContain("Forbidden");

      const eMemberUpd = await updateExpenseAction(
        expense.id,
        { id: expense.id, title: "Allowed By Member" },
        memberSession
      );
      expect(eMemberUpd.success).toBe(true);

      const eMemberDel = await deleteExpenseAction(expense.id, memberSession);
      expect(eMemberDel.success).toBe(true);

      // Treasury settings: OWNER only (VIEWER, MEMBER, ADMIN blocked)
      for (const nonOwner of [viewerSession, memberSession, adminSession]) {
        const tDenied = await updateTreasurySettingsAction(
          { liquidReserve: 100000 },
          nonOwner
        );
        expect(tDenied.success).toBe(false);
        expect(tDenied.error).toContain("Forbidden");
      }

      const tOwner = await updateTreasurySettingsAction(
        { liquidReserve: 600000, safetyBuffer: 75000 },
        ownerSession
      );
      expect(tOwner.success).toBe(true);
      expect(tOwner.data?.liquidReserve).toBe(600000);
    }, 30000);
  });

  // =========================================================================
  // 5. Contract E: Expenses Bulk CSV Import & Normalization
  // =========================================================================
  describe("Contract E: Expenses Bulk CSV Import & Normalization", () => {
    it("normalizes categories and recurrence aliases cleanly", () => {
      expect(parseExpenseCategory("SaaS")).toBe("SOFTWARE");
      expect(parseExpenseCategory("Salaries")).toBe("PAYROLL");
      expect(parseExpenseCategory("Office Lease")).toBe("OTHER");
      expect(parseExpenseCategory("Rent")).toBe("RENT");
      expect(parseExpenseRecurrence("monthly")).toBe("MONTHLY");
      expect(parseExpenseRecurrence("yearly")).toBe("ANNUALLY");
      expect(parseExpenseRecurrence("once")).toBe("NONE");
    });

    it("imports valid expense rows atomically, skips bad rows, and enforces RBAC", async () => {
      const viewerSession = makeSession("VIEWER", companyPkrId, ownerUserId);
      const memberSession = makeSession("MEMBER", companyPkrId, ownerUserId);

      const denied = await bulkImportExpensesAction(
        [{ title: "Blocked", amount: 100, dueDate: "2026-12-01" }],
        viewerSession
      );
      expect(denied.success).toBe(false);
      expect(denied.error).toContain("Forbidden");

      const res = await bulkImportExpenses(
        companyPkrId,
        [
          {
            rowNumber: 2,
            title: "CSV Cloud Database",
            category: "CLOUD",
            amount: 18500,
            dueDate: "2026-12-10",
            recurrence: "MONTHLY",
            notes: "Neon cluster",
          },
          {
            rowNumber: 3,
            title: "Invalid Zero Amount",
            category: "OTHER",
            amount: 0,
            dueDate: "2026-12-10",
          },
        ],
        ownerUserId
      );

      expect(res.createdCount).toBe(1);
      expect(res.failedCount).toBe(1);
      expect(res.createdExpenses[0].category).toBe("SOFTWARE");
      expect(res.createdExpenses[0].recurrence).toBe("MONTHLY");

      const viaAction = await bulkImportExpensesAction(
        [
          {
            title: "CSV Fiber Internet",
            category: "INTERNET",
            amount: 7500,
            dueDate: "2026-12-15",
            recurrence: "MONTHLY",
          },
        ],
        memberSession
      );
      expect(viaAction.success).toBe(true);
      expect(viaAction.data?.createdCount).toBe(1);
    }, 30000);
  });
});
