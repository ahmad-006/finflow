"use client";

import * as React from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import { ArrowLeft, Printer, Download, Loader2, CheckCircle2 } from "lucide-react";
import type { InvoiceWithItemsAndClient } from "@/modules/invoices/types";
import { formatMoney } from "@/lib/format";
import { downloadInvoicePDF, DEFAULT_EXCHANGE_RATES } from "@/modules/documents";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

export interface PrintInvoiceDocumentProps {
  invoice: InvoiceWithItemsAndClient;
  companyName: string;
  baseCurrency?: string;
  companyAddress?: string | null;
  companyEmail?: string | null;
}

export function PrintInvoiceDocument({
  invoice,
  companyName,
  baseCurrency = "PKR",
  companyAddress,
  companyEmail,
}: PrintInvoiceDocumentProps) {
  const [isDownloading, setIsDownloading] = React.useState(false);

  const remainingBalance = Decimal.max(
    0,
    new Decimal(invoice.totalAmount).minus(invoice.paidAmount)
  )
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();
  const isForeign = invoice.currency !== baseCurrency;
  const fxRate = invoice.exchangeRate || DEFAULT_EXCHANGE_RATES[invoice.currency] || 1.0;
  const baseTotal =
    invoice.baseTotalAmount ??
    (invoice.currency === baseCurrency
      ? invoice.totalAmount
      : new Decimal(invoice.totalAmount)
          .times(fxRate)
          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
          .toNumber());

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 60));
      downloadInvoicePDF(invoice, {
        companyName,
        baseCurrency,
      });
    } catch (err) {
      console.error("PDF download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-fog/40 print:bg-white print:min-h-0 py-6 print:py-0">
      {/* Top Floating Control Bar (Print Hidden) */}
      <div className="print:hidden max-w-[210mm] mx-auto mb-6 px-4 flex items-center justify-between">
        <Link
          href={`/invoices/${invoice.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-white text-xs font-medium text-ink/70 hover:bg-fog hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Cockpit</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-line bg-white text-xs font-medium text-ink/70 hover:bg-fog hover:text-ink transition-colors disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-ink text-white text-xs font-medium hover:bg-ink/90 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      {/* Printable A4 Paper Sheet (Template G) */}
      <div
        className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-[20mm] border border-line print:border-none print:p-0 print:max-w-none print:w-full print:min-h-0 text-ink text-[12px] leading-relaxed shadow-float print:shadow-none"
        style={{
          boxSizing: "border-box",
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              background: #FFFFFF !important;
              color: #0D1B2A !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .break-inside-avoid {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}} />

        {/* 1. Header & Title Strip */}
        <div className="flex justify-between items-start pb-6 border-b border-line">
          {/* Company Details */}
          <div className="flex flex-col gap-1 max-w-[55%]">
            <span className="text-xl font-bold tracking-tight text-ink">
              {companyName}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink/50">
              Commercial Invoice &middot; FinFlow Treasury Systems
            </span>
            {companyEmail && (
              <span className="text-[11px] text-ink/70">{companyEmail}</span>
            )}
            {companyAddress && (
              <span className="text-[11px] text-ink/60 whitespace-pre-line mt-0.5">
                {companyAddress}
              </span>
            )}
          </div>

          {/* Document Title & Invoice Info */}
          <div className="flex flex-col items-end gap-1">
            <h1 className="text-3xl font-light tracking-tight text-ink">
              Invoice
            </h1>
            <span className="font-mono font-bold text-sm text-ink">
              {invoice.invoiceNumber}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* 2. Metadata Grid: Bill To & Dates */}
        <div className="grid grid-cols-2 gap-8 py-6 border-b border-line text-[11px]">
          {/* Bill To */}
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink/50">
              Billed To
            </span>
            <span className="text-xs font-bold text-ink">
              {invoice.client.clientName}
            </span>
            <span className="text-ink/70">{invoice.client.email}</span>
            {invoice.client.phone && (
              <span className="text-ink/60">{invoice.client.phone}</span>
            )}
            {invoice.client.address && (
              <span className="text-ink/60 whitespace-pre-line mt-0.5">
                {invoice.client.address}
              </span>
            )}
          </div>

          {/* Dates & Currency */}
          <div className="flex flex-col gap-1.5 items-end text-right">
            <div className="flex items-center justify-between w-full max-w-[200px]">
              <span className="font-mono text-ink/50">ISSUE DATE:</span>
              <span className="font-mono font-medium text-ink">
                {formatDate(invoice.issueDate)}
              </span>
            </div>
            <div className="flex items-center justify-between w-full max-w-[200px]">
              <span className="font-mono text-ink/50">DUE DATE:</span>
              <span className="font-mono font-medium text-ink">
                {formatDate(invoice.dueDate)}
              </span>
            </div>
            <div className="flex items-center justify-between w-full max-w-[200px]">
              <span className="font-mono text-ink/50">CURRENCY:</span>
              <span className="font-mono font-bold text-ink">
                {invoice.currency}
              </span>
            </div>
            {invoice.client.paymentTermsDays && (
              <div className="flex items-center justify-between w-full max-w-[200px]">
                <span className="font-mono text-ink/50">TERMS:</span>
                <span className="font-mono text-ink">
                  Net {invoice.client.paymentTermsDays} Days
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Line Items Auto-Table */}
        <div className="py-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-fog/50 text-[10px] font-mono uppercase tracking-wider text-ink/60">
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right w-16">Qty</th>
                <th className="py-2.5 px-3 text-right w-24">Unit Price</th>
                <th className="py-2.5 px-3 text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-[11px]">
              {invoice.items.map((item) => (
                <tr key={item.id} className="break-inside-avoid">
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

        {/* 4. Totals Block & Dual-Currency Equivalent */}
        <div className="flex justify-between items-start pt-4 border-t border-line break-inside-avoid">
          {/* Notes & Remittance */}
          <div className="flex flex-col gap-1 max-w-[50%] text-[11px]">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink/50">
              Payment Instructions & Wire Remittance
            </span>
            <p className="text-ink/70 whitespace-pre-line leading-relaxed">
              {invoice.notes ||
                "Please remit full payment according to specified terms. Cite invoice number on wire remittance."}
            </p>
          </div>

          {/* Figures Column */}
          <div className="flex flex-col gap-1.5 w-[220px] text-[11px]">
            <div className="flex justify-between items-center text-ink/70">
              <span>Subtotal</span>
              <span className="font-mono text-ink">
                {formatMoney(invoice.subtotal, invoice.currency)}
              </span>
            </div>

            {invoice.taxRate > 0 && (
              <div className="flex justify-between items-center text-ink/70">
                <span>Tax ({invoice.taxRate}%)</span>
                <span className="font-mono text-ink">
                  {formatMoney(invoice.taxAmount, invoice.currency)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-line font-medium text-ink text-xs">
              <span>Total</span>
              <span className="font-mono font-bold text-sm">
                {formatMoney(invoice.totalAmount, invoice.currency)}
              </span>
            </div>

            {invoice.paidAmount > 0 && (
              <div className="flex justify-between items-center text-emerald-700">
                <span>Paid to Date</span>
                <span className="font-mono font-medium">
                  - {formatMoney(invoice.paidAmount, invoice.currency)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-line font-bold text-ink">
              <span>Balance Due</span>
              <span
                className={`font-mono text-sm ${
                  remainingBalance > 0 && invoice.status === "OVERDUE"
                    ? "text-ember"
                    : "text-ink"
                }`}
              >
                {formatMoney(remainingBalance, invoice.currency)}
              </span>
            </div>

            {/* Dual Currency Base Equivalent (Inkline Monochromatic Box) */}
            {isForeign && (
              <div className="mt-3 p-2.5 rounded bg-fog/50 border border-line flex flex-col gap-1 text-[10px]">
                <span className="font-mono text-ink/50 uppercase font-semibold text-[9px] tracking-wider">
                  BASE EQUIVALENT ({baseCurrency})
                </span>
                <span className="font-mono font-bold text-ink text-[11px]">
                  {formatMoney(invoice.totalAmount, invoice.currency)} = {formatMoney(baseTotal, baseCurrency)}
                </span>
                <span className="text-[9px] text-ink/50 font-mono">
                  Spot FX Rate: 1 {invoice.currency} = {fxRate} {baseCurrency}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 5. Online Verification & Document Security */}
        <div className="mt-10 pt-4 border-t border-line flex justify-between items-center text-[10px] text-ink/50 break-inside-avoid">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-ink/40" />
            <span>
              Verify online:{" "}
              <Link
                href={`/pay/${invoice.viewToken}`}
                className="text-ink underline hover:text-ink/80 font-mono"
              >
                /pay/{invoice.viewToken}
              </Link>
            </span>
          </div>

          <span className="font-mono">
            FinFlow Treasury Systems &middot; Official Commercial Document
          </span>
        </div>
      </div>
    </div>
  );
}
