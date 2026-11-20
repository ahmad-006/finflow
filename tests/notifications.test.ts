import { describe, it, expect, afterAll } from "bun:test";
import { db } from "@/lib/db";
import { sendInvoicePaymentReminder } from "@/modules/notifications/service";
import { registerUser } from "@/modules/auth/service";

describe("Domain 9: Production Hardening - Real-Time Reminders & State Sync (tests/notifications.test.ts)", () => {
  const createdCompanyIds: string[] = [];

  afterAll(async () => {
    for (const companyId of createdCompanyIds) {
      try {
        await db.company.delete({ where: { id: companyId } });
      } catch {
        // Cascading deletion
      }
    }
  });

  const timestamp = Date.now() + 400;
  let companyAId = "";
  let userAId = "";
  let companyBId = "";
  let userBId = "";
  let clientAId = "";
  let sentInvoiceId = "";
  let paidInvoiceId = "";
  let cancelledInvoiceId = "";

  it("should setup test companies, clients, and multi-status invoices", async () => {
    // 1. Provision Company A & Owner
    const regA = await registerUser({
      companyName: `Reminders Alpha Corp ${timestamp}`,
      fullName: "Alpha Owner",
      email: `alpha-notif-${timestamp}@test.pk`,
      password: "AlphaPassword2026!#",
    });
    companyAId = regA.company.id;
    userAId = regA.user.id;
    createdCompanyIds.push(companyAId);

    // 2. Provision Company B & Owner
    const regB = await registerUser({
      companyName: `Reminders Beta Corp ${timestamp}`,
      fullName: "Beta Owner",
      email: `beta-notif-${timestamp}@test.pk`,
      password: "BetaPassword2026!#",
    });
    companyBId = regB.company.id;
    userBId = regB.user.id;
    createdCompanyIds.push(companyBId);

    // 3. Create Client for Company A
    const clientA = await db.client.create({
      data: {
        companyId: companyAId,
        clientName: "Reminders Recipient Ltd",
        email: `client-target-${timestamp}@enterprise.test`,
        riskStatus: "HEALTHY",
      },
    });
    clientAId = clientA.id;

    // 4. Create Outstanding/Sent Invoice
    const invSent = await db.invoice.create({
      data: {
        companyId: companyAId,
        clientId: clientAId,
        invoiceNumber: `INV-${timestamp}-001`,
        currency: "PKR",
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 86400000), // in 7 days
        subtotal: 100000.0,
        totalAmount: 100000.0,
        baseTotalAmount: 100000.0,
        status: "SENT",
      },
    });
    sentInvoiceId = invSent.id;

    // 5. Create PAID Invoice
    const invPaid = await db.invoice.create({
      data: {
        companyId: companyAId,
        clientId: clientAId,
        invoiceNumber: `INV-${timestamp}-002`,
        currency: "PKR",
        issueDate: new Date(),
        dueDate: new Date(),
        subtotal: 50000.0,
        totalAmount: 50000.0,
        baseTotalAmount: 50000.0,
        status: "PAID",
        paidAmount: 50000.0,
        paidAt: new Date(),
      },
    });
    paidInvoiceId = invPaid.id;

    // 6. Create CANCELLED Invoice
    const invCancelled = await db.invoice.create({
      data: {
        companyId: companyAId,
        clientId: clientAId,
        invoiceNumber: `INV-${timestamp}-003`,
        currency: "PKR",
        issueDate: new Date(),
        dueDate: new Date(),
        subtotal: 25000.0,
        totalAmount: 25000.0,
        baseTotalAmount: 25000.0,
        status: "CANCELLED",
      },
    });
    cancelledInvoiceId = invCancelled.id;

    expect(sentInvoiceId).toBeString();
    expect(paidInvoiceId).toBeString();
    expect(cancelledInvoiceId).toBeString();
  }, 30000);

  // =========================================================================
  // 1. Dispatch & Delivery Logging Contracts
  // =========================================================================
  describe("sendInvoicePaymentReminder Service Execution", () => {
    it("should successfully dispatch reminder email and record in reminder_logs & audit_logs", async () => {
      const result = await sendInvoicePaymentReminder(companyAId, sentInvoiceId, userAId);

      expect(result).not.toBeNull();
      expect(result.id).toBeString();
      expect(result.invoiceId).toBe(sentInvoiceId);
      expect(result.recipientEmail).toBe(`client-target-${timestamp}@enterprise.test`);
      expect(result.status).toBe("SENT");
      expect(result.sentAt).toBeInstanceOf(Date);

      // Verify database record in reminder_logs
      const logRecord = await db.reminderLog.findUnique({
        where: { id: result.id },
      });
      expect(logRecord).not.toBeNull();
      expect(logRecord?.companyId).toBe(companyAId);
      expect(logRecord?.invoiceId).toBe(sentInvoiceId);
      expect(logRecord?.recipientEmail).toBe(`client-target-${timestamp}@enterprise.test`);
      expect(logRecord?.status).toBe("SENT");
      expect(logRecord?.channel).toBe("EMAIL");

      // Verify audit log
      const audit = await db.auditLog.findFirst({
        where: {
          companyId: companyAId,
          entityId: sentInvoiceId,
          action: "REMINDER_SENT",
        },
      });
      expect(audit).not.toBeNull();
    }, 20000);
  });

  // =========================================================================
  // 2. Multi-Tenant Boundary Isolation
  // =========================================================================
  describe("Multi-Tenant Cross-Boundary Protection", () => {
    it("should reject cross-tenant reminder dispatch: Company B cannot trigger reminder for Company A invoice", async () => {
      await expect(
        sendInvoicePaymentReminder(companyBId, sentInvoiceId, userBId)
      ).rejects.toThrow("Invoice not found or access denied.");

      // Verify no reminder log was created under Company B
      const unauthorizedLogs = await db.reminderLog.findMany({
        where: {
          companyId: companyBId,
          invoiceId: sentInvoiceId,
        },
      });
      expect(unauthorizedLogs).toHaveLength(0);
    }, 15000);
  });

  // =========================================================================
  // 3. Status Rejection & Terminal Lifecycle Guardrails
  // =========================================================================
  describe("Terminal Invoice Lifecycle Guardrails", () => {
    it("should reject reminder dispatch on already PAID invoices", async () => {
      await expect(
        sendInvoicePaymentReminder(companyAId, paidInvoiceId, userAId)
      ).rejects.toThrow("Cannot send reminder for an invoice with status PAID.");
    }, 15000);

    it("should reject reminder dispatch on CANCELLED invoices", async () => {
      await expect(
        sendInvoicePaymentReminder(companyAId, cancelledInvoiceId, userAId)
      ).rejects.toThrow("Cannot send reminder for an invoice with status CANCELLED.");
    }, 15000);

    it("should reject reminder dispatch for non-existent invoice ID", async () => {
      await expect(
        sendInvoicePaymentReminder(companyAId, "00000000-0000-0000-0000-000000000000", userAId)
      ).rejects.toThrow("Invoice not found or access denied.");
    }, 15000);
  });
});
