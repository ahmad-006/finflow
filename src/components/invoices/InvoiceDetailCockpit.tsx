"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  Copy,
  Check,
  Send,
  CreditCard,
  Ban,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Loader2,
  Bell,
} from "lucide-react";
import type { InvoiceWithItemsAndClient } from "@/modules/invoices/types";
import { formatMoney } from "@/modules/invoices/currency";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { formatUserError } from "@/lib/errors";
import { downloadInvoicePDF } from "@/modules/documents";
import {
  markInvoiceSentAction,
  cancelInvoiceAction,
} from "@/modules/invoices/actions";
import { sendInvoiceReminderAction } from "@/modules/notifications/actions";

interface InvoiceDetailCockpitProps {
  invoice: InvoiceWithItemsAndClient;
  companyName: string;
  baseCurrency?: string;
}

export function InvoiceDetailCockpit({
  invoice,
  companyName,
  baseCurrency = "PKR",
}: InvoiceDetailCockpitProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState(false);
  const [isSendingReminder, setIsSendingReminder] = React.useState(false);
  const [reminderSuccess, setReminderSuccess] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const remainingBalance = Math.max(0, invoice.totalAmount - invoice.paidAmount);
  const isForeign = invoice.currency !== baseCurrency;

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const handleDownloadPdf = async () => {
    setActionError(null);
    setIsDownloadingPdf(true);
    try {
      // Yield to event loop to allow loading spinner to render
      await new Promise((resolve) => setTimeout(resolve, 60));
      downloadInvoicePDF(invoice, {
        companyName,
        baseCurrency,
      });
    } catch (err) {
      console.error("PDF download failed:", err);
      setActionError("Failed to generate PDF document. Please try again.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleCopyPublicLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${origin}/pay/${invoice.viewToken}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleMarkSent = () => {
    setActionError(null);
    startTransition(async () => {
      try {
        const res = await markInvoiceSentAction(invoice.id);
        if (!res.success) {
          setActionError(res.error || "Failed to mark invoice as sent.");
        } else {
          router.refresh();
        }
      } catch (err) {
        setActionError(formatUserError(err, "Unable to mark invoice as sent. Please check your connection."));
      }
    });
  };

  const handleCancelInvoice = () => {
    if (!confirm("Are you sure you want to cancel this invoice? This cannot be undone.")) {
      return;
    }
    setActionError(null);
    startTransition(async () => {
      try {
        const res = await cancelInvoiceAction(invoice.id);
        if (!res.success) {
          setActionError(res.error || "Failed to cancel invoice.");
        } else {
          router.refresh();
        }
      } catch (err) {
        setActionError(formatUserError(err, "Unable to cancel invoice. Please check your connection."));
      }
    });
  };

  const handleSendReminder = async () => {
    setActionError(null);
    setIsSendingReminder(true);
    try {
      const res = await sendInvoiceReminderAction(invoice.id);
      if (!res.success) {
        setActionError(res.error || "Failed to send payment reminder.");
      } else {
        setReminderSuccess(true);
        setTimeout(() => setReminderSuccess(false), 3000);
        router.refresh();
      }
    } catch (err) {
      setActionError(
        formatUserError(
          err,
          "Unable to send payment reminder. Please check your connection."
        )
      );
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* 1. Header Toolbar (Hidden in Print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full border border-line text-ink/60 hover:text-ink hover:bg-fog transition-colors"
            title="Back to Invoices"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-semibold text-ink">
                {invoice.invoiceNumber}
              </span>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <span className="text-xs text-ink/60">
              Issued for {invoice.client.clientName}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Guest Portal Link Copy */}
          <button
            type="button"
            onClick={handleCopyPublicLink}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-line bg-white text-xs font-medium text-ink/70 hover:bg-fog hover:text-ink transition-colors"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Guest Portal</span>
              </>
            )}
          </button>

          {/* Download PDF Vector Document */}
          <button
            type="button"
            disabled={isDownloadingPdf}
            onClick={handleDownloadPdf}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-line bg-white text-xs font-medium text-ink/70 hover:bg-fog hover:text-ink transition-colors disabled:opacity-50"
            title="Download PDF document (INV-YYYY-XXXX.pdf)"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-ink/70" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          {/* Print / Export */}
          <Link
            href={`/invoices/${invoice.id}/print`}
            target="_blank"
            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-line bg-white text-xs font-medium text-ink/70 hover:bg-fog hover:text-ink transition-colors"
            title="Open printable A4 view"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print View</span>
          </Link>

          {/* Mark Sent (if DRAFT) */}
          {invoice.status === "DRAFT" && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleMarkSent}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-ink text-white text-xs font-medium hover:bg-ink-hover transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isPending ? "Issuing..." : "Issue & Send"}</span>
            </button>
          )}

          {/* Send Reminder (if SENT or OVERDUE) */}
          {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
            <button
              type="button"
              disabled={isSendingReminder}
              onClick={handleSendReminder}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-line bg-white text-xs font-medium text-ink hover:bg-fog hover:text-ink transition-colors disabled:opacity-50"
              title="Send email payment reminder to client"
            >
              {isSendingReminder ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-ink/70" />
                  <span>Sending Reminder...</span>
                </>
              ) : reminderSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-moss" />
                  <span className="text-moss">Reminder Sent</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5 text-ink/70" />
                  <span>Send Reminder</span>
                </>
              )}
            </button>
          )}

          {/* Record Payment (if SENT or OVERDUE) */}
          {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-ink text-white text-xs font-medium hover:bg-ink-hover transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}

          {/* Cancel Invoice */}
          {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleCancelInvoice}
              className="min-h-[44px] inline-flex items-center gap-1 px-4 py-2 rounded-full border border-line text-xs text-ember/80 hover:bg-ember/5 hover:text-ember transition-colors disabled:opacity-50"
            >
              <Ban className="w-3 h-3" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {reminderSuccess && (
        <div className="p-3 rounded-[8px] border border-moss/30 bg-moss/5 text-moss text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-moss" />
          <span>Payment reminder sent to {invoice.client.email}.</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-[8px] border border-ember/30 bg-ember/5 text-ember text-xs">
          {actionError}
        </div>
      )}

      {/* 2. Formal Printable Commercial Invoice Sheet */}
      <div className="border border-line rounded-[10px] bg-white p-6 sm:p-10 flex flex-col gap-8 print:border-none print:p-0">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pb-6 border-b border-line">
          <div className="flex flex-col gap-1">
            <span className="text-xl sm:text-2xl font-serif text-ink tracking-tight font-medium">
              {companyName}
            </span>
            <span className="text-xs font-mono text-ink/50 uppercase tracking-wider">
              Commercial Invoice
            </span>
          </div>

          <div className="flex flex-col sm:items-end gap-1">
            <span className="text-lg font-mono font-bold text-ink">
              {invoice.invoiceNumber}
            </span>
            <div className="flex items-center gap-2 text-xs text-ink/60">
              <span>Status:</span>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* Bill To & Metadata Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-line">
          {/* Client Details */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink/50">
              Billed To
            </span>
            <span className="text-sm font-semibold text-ink">
              {invoice.client.clientName}
            </span>
            <span className="text-xs text-ink/70">
              {invoice.client.email}
            </span>
            {invoice.client.phone && (
              <span className="text-xs text-ink/60">
                {invoice.client.phone}
              </span>
            )}
            {invoice.client.address && (
              <span className="text-xs text-ink/60 whitespace-pre-line mt-1">
                {invoice.client.address}
              </span>
            )}
          </div>

          {/* Dates & Terms */}
          <div className="flex flex-col gap-2 sm:items-end text-xs">
            <div className="flex items-center justify-between sm:justify-end gap-6 w-full">
              <span className="text-ink/50 font-mono">ISSUE DATE:</span>
              <span className="font-mono text-ink">{formatDate(invoice.issueDate)}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-6 w-full">
              <span className="text-ink/50 font-mono">PAYMENT DUE:</span>
              <span className="font-mono font-medium text-ink">{formatDate(invoice.dueDate)}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-6 w-full">
              <span className="text-ink/50 font-mono">TERMS:</span>
              <span className="font-mono text-ink">Net {invoice.client.paymentTermsDays} Days</span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-6 w-full">
              <span className="text-ink/50 font-mono">CURRENCY:</span>
              <span className="font-mono font-semibold text-ink">{invoice.currency}</span>
            </div>
          </div>
        </div>

        {/* Line Items Section */}
        {/* A. Mobile Card Items Stack (< 768px) */}
        <div className="md:hidden print:hidden divide-y divide-line border border-line rounded-[8px] overflow-hidden">
          {invoice.items.map((item) => (
            <div key={item.id} className="p-3.5 flex flex-col gap-2 bg-white">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-xs text-ink">{item.description}</span>
                <span className="font-mono font-semibold text-xs text-ink shrink-0">
                  {formatMoney(item.lineTotal, invoice.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-ink/60 font-mono">
                <span>Qty: {item.quantity}</span>
                <span>Unit: {formatMoney(item.unitPrice, invoice.currency)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* B. Desktop Table (>= 768px, and print) */}
        <div className="hidden md:block print:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line text-[11px] font-mono uppercase tracking-wider text-ink/60 bg-fog/30">
                <th scope="col" className="py-2.5 px-3 font-normal">Description</th>
                <th scope="col" className="py-2.5 px-3 text-right w-24 font-normal">Qty</th>
                <th scope="col" className="py-2.5 px-3 text-right w-32 font-normal">Unit Price</th>
                <th scope="col" className="py-2.5 px-3 text-right w-36 font-normal">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-xs">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 px-3 font-medium text-ink">
                    {item.description}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-ink/70">
                    {item.quantity}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-ink/70">
                    {formatMoney(item.unitPrice, invoice.currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-medium text-ink">
                    {formatMoney(item.lineTotal, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Balance Due */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pt-4 border-t border-line">
          {/* Notes & Bank Details */}
          <div className="flex flex-col gap-1.5 max-w-sm">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink/50">
              Notes & Instructions
            </span>
            <p className="text-xs text-ink/70 whitespace-pre-line leading-relaxed">
              {invoice.notes || "Payment is requested in full by the due date specified. Please cite invoice number with wire transfer."}
            </p>
          </div>

          {/* Numbers Column */}
          <div className="flex flex-col gap-2 w-full sm:w-72 text-xs">
            <div className="flex items-center justify-between text-ink/70">
              <span>Subtotal</span>
              <span className="font-mono text-ink">
                {formatMoney(invoice.subtotal, invoice.currency)}
              </span>
            </div>

            {invoice.taxRate > 0 && (
              <div className="flex items-center justify-between text-ink/70">
                <span>Tax ({invoice.taxRate}%)</span>
                <span className="font-mono text-ink">
                  {formatMoney(invoice.taxAmount, invoice.currency)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-line font-medium text-ink text-sm">
              <span>Total Amount</span>
              <span className="font-mono text-base">
                {formatMoney(invoice.totalAmount, invoice.currency)}
              </span>
            </div>

            {invoice.paidAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-700">
                <span>Paid Amount</span>
                <span className="font-mono font-medium">
                  - {formatMoney(invoice.paidAmount, invoice.currency)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-line font-semibold text-ink text-sm">
              <span>Balance Due</span>
              <span
                className={`font-mono text-lg ${
                  remainingBalance > 0 && invoice.status === "OVERDUE"
                    ? "text-ember"
                    : "text-ink"
                }`}
              >
                {formatMoney(remainingBalance, invoice.currency)}
              </span>
            </div>

            {/* Foreign Spot Rate Frozen Disclosure */}
            {isForeign && (
              <div className="mt-2 p-2.5 rounded-[8px] bg-fog/40 border border-line flex flex-col gap-0.5 text-[11px]">
                <span className="font-mono text-ink/60 uppercase">
                  Frozen FX Spot Rate
                </span>
                <span className="font-mono font-medium text-ink">
                  1 {invoice.currency} = {invoice.exchangeRate} {baseCurrency}
                </span>
                <span className="text-[10px] text-ink/50 mt-0.5">
                  Base Total: {formatMoney(invoice.baseTotalAmount, baseCurrency as any)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Audit Trail & Lifecycle Timeline (Print-Hidden) */}
      <div className="print:hidden border border-line rounded-[10px] bg-white p-5 flex flex-col gap-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-ink/60">
          Invoice Lifecycle & Settlement Audit Trail
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Created Step */}
          <div className="flex items-start gap-3 p-3 rounded-[8px] bg-fog/20 border border-line">
            <CheckCircle2 className="w-4 h-4 text-ink shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-ink">1. Draft Generated</span>
              <span className="text-[11px] text-ink/60">{formatDate(invoice.createdAt)}</span>
              <span className="text-[10px] text-ink/40 font-mono">Ref: {invoice.id.slice(0, 8)}</span>
            </div>
          </div>

          {/* Sent Step */}
          <div
            className={`flex items-start gap-3 p-3 rounded-[8px] border ${
              invoice.status !== "DRAFT"
                ? "bg-fog/20 border-line"
                : "bg-white border-line/50 opacity-50"
            }`}
          >
            <Send className="w-4 h-4 text-ink shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-ink">2. Issued to Customer</span>
              <span className="text-[11px] text-ink/60">
                {invoice.status !== "DRAFT" ? formatDate(invoice.issueDate) : "Awaiting transmission"}
              </span>
              <span className="text-[10px] text-ink/40 font-mono">
                Due: {formatDate(invoice.dueDate)}
              </span>
            </div>
          </div>

          {/* Settled Step */}
          <div
            className={`flex items-start gap-3 p-3 rounded-[8px] border ${
              invoice.status === "PAID"
                ? "bg-emerald-50/60 border-emerald-200"
                : "bg-white border-line/50 opacity-60"
            }`}
          >
            {invoice.status === "PAID" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : invoice.status === "OVERDUE" ? (
              <AlertTriangle className="w-4 h-4 text-ember shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-4 h-4 text-ink/40 shrink-0 mt-0.5" />
            )}
            <div className="flex flex-col">
              <span
                className={`text-xs font-medium ${
                  invoice.status === "PAID" ? "text-emerald-800" : "text-ink"
                }`}
              >
                3. Payment Settlement
              </span>
              <span className="text-[11px] text-ink/60">
                {invoice.paidAt
                  ? `Settled on ${formatDate(invoice.paidAt)}`
                  : invoice.status === "OVERDUE"
                  ? "Past payment terms"
                  : "Pending collection"}
              </span>
              {invoice.paidAt && invoice.dueDate && (
                <span className="text-[10px] font-mono text-emerald-700 mt-0.5">
                  {new Date(invoice.paidAt) <= new Date(invoice.dueDate)
                    ? "Settled on schedule"
                    : `Settled with delay`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        totalAmount={invoice.totalAmount}
        paidAmount={invoice.paidAmount}
        currency={invoice.currency}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
