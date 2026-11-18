import * as React from "react";
import { notFound } from "next/navigation";
import { getInvoiceByViewToken } from "@/modules/invoices/service";
import { formatMoney } from "@/modules/invoices/currency";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { Band } from "@/components/shell/Band";

interface GuestPayPageProps {
  params: Promise<{ token: string }>;
}

async function GuestPayDataLoader({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getInvoiceByViewToken(token);

  if (!result) {
    notFound();
  }

  const { invoice, company } = result;
  const remaining = Math.max(0, invoice.totalAmount - invoice.paidAmount);

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <Band tone="white" className="max-w-3xl mx-auto rounded-[10px] border border-line bg-white p-6 sm:p-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pb-6 border-b border-line">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-mono uppercase tracking-wider text-ink/50">
            Commercial Invoice
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif text-ink tracking-tight">
            {company.name}
          </h1>
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
          {invoice.client.address && <span className="text-ink/60 whitespace-pre-line mt-1">{invoice.client.address}</span>}
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
        </div>
      </div>

      {/* Line Items */}
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
                <td className="py-3 px-3 text-right font-mono text-ink/70">{formatMoney(item.unitPrice, invoice.currency)}</td>
                <td className="py-3 px-3 text-right font-mono font-medium text-ink">{formatMoney(item.lineTotal, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals & Settlement */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pt-4 border-t border-line">
        <div className="flex flex-col gap-1.5 max-w-sm">
          <span className="text-[11px] font-mono uppercase tracking-wider text-ink/50">
            Payment Instructions
          </span>
          <p className="text-xs text-ink/70 whitespace-pre-line leading-relaxed">
            {invoice.notes || "Please remit full payment according to specified payment terms. Cite invoice number on wire remittance."}
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-64 text-xs">
          <div className="flex items-center justify-between text-ink/70">
            <span>Subtotal</span>
            <span className="font-mono text-ink">{formatMoney(invoice.subtotal, invoice.currency)}</span>
          </div>
          {invoice.taxRate > 0 && (
            <div className="flex items-center justify-between text-ink/70">
              <span>Tax ({invoice.taxRate}%)</span>
              <span className="font-mono text-ink">{formatMoney(invoice.taxAmount, invoice.currency)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-line font-medium text-ink">
            <span>Total</span>
            <span className="font-mono text-sm">{formatMoney(invoice.totalAmount, invoice.currency)}</span>
          </div>
          {invoice.paidAmount > 0 && (
            <div className="flex items-center justify-between text-emerald-700">
              <span>Paid to Date</span>
              <span className="font-mono">- {formatMoney(invoice.paidAmount, invoice.currency)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-line font-bold text-ink">
            <span>Balance Due</span>
            <span className="font-mono text-base text-ink">{formatMoney(remaining, invoice.currency)}</span>
          </div>
        </div>
      </div>
    </Band>
  );
}

function GuestPaySkeleton() {
  return (
    <div className="max-w-3xl mx-auto rounded-[10px] border border-line bg-white p-8 animate-pulse select-none flex flex-col gap-6">
      <div className="h-8 w-48 rounded bg-fog" />
      <div className="h-20 w-full rounded bg-fog" />
      <div className="h-40 w-full rounded bg-fog" />
    </div>
  );
}

export default function GuestPayPage({ params }: GuestPayPageProps) {
  return (
    <main className="min-h-screen bg-fog/20 py-8 sm:py-16">
      <React.Suspense fallback={<GuestPaySkeleton />}>
        <GuestPayDataLoader params={params} />
      </React.Suspense>
    </main>
  );
}
