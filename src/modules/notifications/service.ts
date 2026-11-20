import { db } from "@/lib/db";
import { sendInvoiceReminderEmail } from "@/lib/mail";
import type { SendReminderResult, ReminderDeliveryStatus } from "./types";

/**
 * Dispatches an automated payment reminder email to the invoice client and
 * records delivery logs and compliance audit logs.
 */
export async function sendInvoicePaymentReminder(
  companyId: string,
  invoiceId: string,
  userId?: string
): Promise<SendReminderResult> {
  if (!companyId) {
    throw new Error("Unauthorized: Company tenancy is required.");
  }

  // 1. Look up invoice with client and company, verifying invoice.companyId === companyId
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      company: true,
    },
  });

  if (!invoice || invoice.companyId !== companyId) {
    throw new Error("Invoice not found or access denied.");
  }

  // 2. Reject if invoice.status === 'PAID' or 'CANCELLED'
  if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
    throw new Error(
      `Cannot send reminder for an invoice with status ${invoice.status}.`
    );
  }

  // 3. Verify client has an email
  if (!invoice.client || !invoice.client.email || !invoice.client.email.trim()) {
    throw new Error("Client does not have a registered email address.");
  }

  // 4. Construct public payment URL
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/+$/, "");
  const publicPayUrl = `${baseUrl}/pay/${invoice.viewToken}`;

  // 5. Format amount and due date
  const numAmount = Number(invoice.totalAmount);
  const amountFormatted = `${invoice.currency} ${numAmount.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;

  const dueDateFormatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(invoice.dueDate));

  // 6. Determine isOverdue = invoice.status === 'OVERDUE' || new Date(invoice.dueDate) < new Date()
  const isOverdue =
    invoice.status === "OVERDUE" || new Date(invoice.dueDate) < new Date();

  // 7. Call sendInvoiceReminderEmail from src/lib/mail.ts
  const emailSent = await sendInvoiceReminderEmail({
    clientEmail: invoice.client.email,
    clientName: invoice.client.clientName,
    companyName: invoice.company.name,
    invoiceNumber: invoice.invoiceNumber,
    amountFormatted,
    dueDateFormatted,
    isOverdue,
    publicPayUrl,
  });

  const deliveryStatus: ReminderDeliveryStatus = emailSent ? "SENT" : "FAILED";

  // 8. Record in prisma.reminderLog
  const reminderLog = await db.reminderLog.create({
    data: {
      invoiceId: invoice.id,
      companyId: invoice.companyId,
      recipientEmail: invoice.client.email,
      status: deliveryStatus,
      channel: "EMAIL",
      error: emailSent ? null : "Email delivery failed via mail provider",
      sentAt: new Date(),
    },
  });

  // 9. Record in prisma.auditLog
  await db.auditLog.create({
    data: {
      companyId,
      userId: userId || null,
      entityType: "INVOICE",
      entityId: invoice.id,
      action: "REMINDER_SENT",
      details: JSON.stringify({
        reminderLogId: reminderLog.id,
        recipientEmail: invoice.client.email,
        status: reminderLog.status,
        invoiceNumber: invoice.invoiceNumber,
        amount: numAmount,
        currency: invoice.currency,
        isOverdue,
      }),
    },
  });

  // 10. Return result with reminderLog id and sentAt
  return {
    id: reminderLog.id,
    invoiceId: reminderLog.invoiceId,
    recipientEmail: reminderLog.recipientEmail,
    status: reminderLog.status as ReminderDeliveryStatus,
    sentAt: reminderLog.sentAt,
  };
}

/**
 * Retrieves past reminder history for a specific invoice.
 */
export async function getInvoiceReminders(companyId: string, invoiceId: string) {
  return db.reminderLog.findMany({
    where: { invoiceId, companyId },
    orderBy: { sentAt: "desc" },
  });
}
