"use client";

import * as React from "react";
import Decimal from "decimal.js";
import { Download, Printer, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import type { InvoiceWithItemsAndClient } from "@/modules/invoices/types";
import { formatMoney } from "@/lib/format";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { downloadInvoicePDF } from "@/modules/documents";
import { Band } from "@/components/shell/Band";

export interface GuestPayViewProps {
  invoice: InvoiceWithItemsAndClient;
  company: {
    id?: string;
    name: string;
    baseCurrency?: string;
    billingEmail?: string | null;
    phone?: string | null;
    address?: string | null;
    taxId?: string | null;
    remittanceInstructions?: string | null;
  };
}

export function GuestPayView({ invoice, company }: GuestPayViewProps) {
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);

  const remainingBalance = Decimal.max(
    0,
    new Decimal(invoice.totalAmount).minus(invoice.paidAmount)
  )
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();
  const isForeign = invoice.currency !== (company.baseCurrency || "PKR");

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const handleDownloadPDF = async () => {
    setDownloadError(null);
    setIsDownloading(true);
    try {
      // Yield to event loop to allow loading spinner to render smoothly
      await new Promise((resolve) => setTimeout(resolve, 60));
      downloadInvoicePDF(invoice, {
        companyName: company.name,
        baseCurrency: company.baseCurrency || "PKR",
        companyEmail: company.billingEmail || undefined,
        companyPhone: company.phone || undefined,
        companyAddress: company.address || undefined,
        wireRemittanceNotes: company.remittanceInstructions || undefined,
      });
    } catch (err) {
      console.error("PDF download failed:", err);
      setDownloadError("Unable to compile PDF document. Please try again or use the print option.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Floating Action Bar (Hidden on Print) */}
      <div className="print:hidden max-w-3xl mx-auto w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-white border border-line">
        <div className="flex items-center gap-2 text-xs text-ink/70">
          <ShieldCheck className="w-4 h-4 text-ink" />
          <span>Verified Commercial Invoice &middot; {invoice.invoiceNumber}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Print Action */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-white text-xs font-medium text-ink/80 hover:bg-fog hover:text-ink transition-colors"
            title="Print paper copy"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          {/* Prominent Download Official PDF Action */}
          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ink text-white text-xs font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
            title="Download official vector PDF document"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download Official PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {downloadError && (
        <div className="print:hidden max-w-3xl mx-auto w-full p-3 rounded-lg border border-ember/30 bg-ember/5 text-ember text-xs">
          {downloadError}
        </div>
      )}

      {/* Main Commercial Paper Sheet */}
      <Band
        tone="white"
        className="max-w-3xl mx-auto w-full rounded-lg border border-line bg-white p-6 sm:p-12 print:border-none print:p-0"
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pb-6 border-b border-line">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink/50">
              Commercial Invoice
            </span>
            <h1 className="text-2xl sm:text-3xl font-sans font-semibold text-ink tracking-tight">
              {company.name}
            </h1>
            {(company.billingEmail || company.phone || company.taxId) && (
              <span className="text-xs text-ink/60">
                {[company.billingEmail, company.phone, company.taxId ? `Tax ID: ${company.taxId}` : null]
                  .filter(Boolean)
                  .join(" • ")}
              </span>
            )}
            {company.address && (
              <span className="text-xs text-ink/50 whitespace-pre-line">
                {company.address}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:items-end gap-1">
            <span className="text-lg font-mono font-bold text-ink">
              {invoice.invoiceNumber}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink/60">Status:</span>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* Bill To & Billing Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-line text-xs">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink/50">
              Billed To
            </span>
            <span className="font-semibold text-sm text-ink">{invoice.client.clientName}</span>
            <span className="text-ink/70">{invoice.client.email}</span>
            {invoice.client.phone && <span className="text-ink/60">{invoice.client.phone}</span>}
            {invoice.client.address && (
              <span className="text-ink/60 whitespace-pre-line mt-1">{invoice.client.address}</span>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex items-center justify-between sm:justify-end gap-4 w-full">
              <span className="font-mono text-ink/50">ISSUE DATE:</span>
              <span className="font-mono text-ink">{formatDate(invoice.issueDate)}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 w-full">
              <span className="font-mono text-ink/50">PAYMENT DUE:</span>
              <span className="font-mono font-medium text-ink">{formatDate(invoice.dueDate)}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 w-full">
              <span className="font-mono text-ink/50">CURRENCY:</span>
              <span className="font-mono font-bold text-ink">{invoice.currency}</span>
            </div>
            {invoice.client.paymentTermsDays && (
              <div className="flex items-center justify-between sm:justify-end gap-4 w-full">
                <span className="font-mono text-ink/50">TERMS:</span>
                <span className="font-mono text-ink">Net {invoice.client.paymentTermsDays} Days</span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-6 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line text-[11px] font-mono uppercase tracking-wider text-ink/60 bg-fog/30">
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right w-20">Qty</th>
                <th className="py-2.5 px-3 text-right w-28">Price</th>
                <th className="py-2.5 px-3 text-right w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-xs">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 px-3 font-medium text-ink">{item.description}</td>
                  <td className="py-3 px-3 text-right font-mono text-ink/70">{item.quantity}</td>
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

        {/* Totals & Settlement */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pt-4 border-t border-line">
          <div className="flex flex-col gap-1.5 max-w-sm">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink/50">
              Payment Instructions & Wire Remittance
            </span>
            <p className="text-xs text-ink/70 whitespace-pre-line leading-relaxed">
              {invoice.notes ||
                company.remittanceInstructions ||
                "Please remit full payment according to specified payment terms. Cite invoice number on wire transfer."}
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-64 text-xs">
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
            <div className="flex items-center justify-between pt-2 border-t border-line font-medium text-ink">
              <span>Total</span>
              <span className="font-mono text-sm">
                {formatMoney(invoice.totalAmount, invoice.currency)}
              </span>
            </div>
            {invoice.paidAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-700">
                <span>Paid to Date</span>
                <span className="font-mono font-medium">
                  - {formatMoney(invoice.paidAmount, invoice.currency)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-line font-bold text-ink">
              <span>Balance Due</span>
              <span className="font-mono text-base text-ink">
                {formatMoney(remainingBalance, invoice.currency)}
              </span>
            </div>

            {/* Foreign Spot Rate Frozen Disclosure */}
            {isForeign && (
              <div className="mt-2 p-2.5 rounded-lg bg-fog/40 border border-line flex flex-col gap-0.5 text-[11px]">
                <span className="font-mono text-ink/60 uppercase">
                  Base Equivalent
                </span>
                <span className="font-mono font-medium text-ink">
                  1 {invoice.currency} = {invoice.exchangeRate} {company.baseCurrency || "PKR"}
                </span>
                <span className="text-[10px] text-ink/50 mt-0.5">
                  Base Total: {formatMoney(invoice.baseTotalAmount, company.baseCurrency || "PKR")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Prominent Call to Action */}
        <div className="print:hidden mt-8 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 bg-fog/30 -mx-6 sm:-mx-12 -mb-6 sm:-mb-12 p-6 sm:px-12 rounded-b-lg">
          <div className="flex items-center gap-2 text-xs text-ink/60">
            <CheckCircle2 className="w-4 h-4 text-ink/40" />
            <span>Need an electronic copy for your accounting department?</span>
          </div>

          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-ink text-white text-xs font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Compiling PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download Official PDF</span>
              </>
            )}
          </button>
        </div>
      </Band>
    </div>
  );
}
