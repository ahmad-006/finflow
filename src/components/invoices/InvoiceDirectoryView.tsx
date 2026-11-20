"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  FileText,
  Calendar,
  ArrowRight,
  Filter,
  Download,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type {
  InvoiceWithItemsAndClient,
  InvoiceKPIs,
  InvoiceStatus,
  InvoiceCurrency,
} from "@/modules/invoices/types";
import { formatMoney, SUPPORTED_CURRENCIES } from "@/modules/invoices/currency";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { InvoiceKPIStrip } from "./InvoiceKPIStrip";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { downloadInvoicePDF } from "@/modules/documents";

export interface InvoiceDirectoryViewProps {
  initialInvoices: InvoiceWithItemsAndClient[];
  kpis: InvoiceKPIs;
  baseCurrency?: string;
  companyName?: string;
}

export function InvoiceDirectoryView({
  initialInvoices,
  kpis,
  baseCurrency = "PKR",
  companyName = "FinFlow Commercial Services",
}: InvoiceDirectoryViewProps) {
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = React.useState<InvoiceWithItemsAndClient | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<InvoiceStatus | "ALL">("ALL");
  const [currencyFilter, setCurrencyFilter] = React.useState<InvoiceCurrency | "ALL">("ALL");

  // Client-side instant filtering
  const filteredInvoices = React.useMemo(() => {
    return initialInvoices.filter((inv) => {
      // Status filter
      if (statusFilter !== "ALL" && inv.status !== statusFilter) {
        return false;
      }

      // Currency filter
      if (currencyFilter !== "ALL" && inv.currency !== currencyFilter) {
        return false;
      }

      // Search query
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const matchesNumber = inv.invoiceNumber.toLowerCase().includes(query);
        const matchesClient = inv.client.clientName.toLowerCase().includes(query);
        const matchesEmail = inv.client.email.toLowerCase().includes(query);
        if (!matchesNumber && !matchesClient && !matchesEmail) {
          return false;
        }
      }

      return true;
    });
  }, [initialInvoices, statusFilter, currencyFilter, search]);

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      ALL: initialInvoices.length,
      DRAFT: 0,
      SENT: 0,
      PAID: 0,
      OVERDUE: 0,
      CANCELLED: 0,
    };
    for (const inv of initialInvoices) {
      if (counts[inv.status] !== undefined) {
        counts[inv.status]++;
      }
    }
    return counts;
  }, [initialInvoices]);

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const handleDownloadPDF = async (inv: InvoiceWithItemsAndClient) => {
    setDownloadingId(inv.id);
    try {
      await new Promise((resolve) => setTimeout(resolve, 60));
      downloadInvoicePDF(inv, {
        companyName,
        baseCurrency,
      });
    } catch (err) {
      console.error("Quick PDF download failed:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-mono tracking-wider uppercase text-ink/50">
            Accounts Receivable Ledger
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-ink">
            Invoices & Billing
          </h1>
          <p className="text-sm text-ink/70">
            Multi-currency commercial invoicing, spot rate freezing, and real-time payment reconciliation.
          </p>
        </div>

        <Link
          href="/invoices/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-full bg-ink text-white text-sm font-medium hover:bg-ink-hover transition-colors w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>New Invoice</span>
        </Link>
      </div>

      {/* 2. Executive KPI Strip */}
      <InvoiceKPIStrip kpis={kpis} baseCurrency={baseCurrency} />

      {/* 3. Filter & Search Toolbar */}
      <div className="flex flex-col gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
          {(["ALL", "DRAFT", "SENT", "PAID", "OVERDUE"] as const).map((status) => {
            const isActive = statusFilter === status;
            const count = statusCounts[status] ?? 0;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-ink text-white"
                    : "bg-fog text-ink/70 hover:bg-fog-2 hover:text-ink"
                }`}
              >
                <span>{status === "ALL" ? "All Invoices" : status.charAt(0) + status.slice(1).toLowerCase()}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-white text-ink/60 border border-line"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Currency Selector & Search Input */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-ink/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search invoice or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-11 text-xs sm:text-sm rounded-[10px] border border-line bg-white text-ink placeholder:text-ink/40 focus:outline-none focus:border-ink/50 transition-colors"
            />
          </div>

          {/* Currency Dropdown Filter */}
          <div className="relative w-full sm:w-auto shrink-0">
            <select
              aria-label="Filter by currency"
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value as any)}
              className="appearance-none w-full sm:w-auto pl-3.5 pr-9 h-11 text-xs font-mono rounded-[10px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50 cursor-pointer"
            >
              <option value="ALL">All Currencies</option>
              {SUPPORTED_CURRENCIES.map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-ink/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 4. Directory Data Display */}
      {filteredInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-[10px] border border-line bg-fog/20 text-center">
          <FileText className="w-10 h-10 text-ink/30 mb-3" />
          <h3 className="text-base font-serif text-ink mb-1">No invoices found</h3>
          <p className="text-xs text-ink/60 max-w-sm mb-4">
            {search || statusFilter !== "ALL" || currencyFilter !== "ALL"
              ? "No billing records match the selected filter criteria. Try clearing search or status filters."
              : "No invoices have been recorded yet. Create your first dynamic multi-currency invoice."}
          </p>
          {search || statusFilter !== "ALL" || currencyFilter !== "ALL" ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setCurrencyFilter("ALL");
              }}
              className="min-h-[44px] px-5 py-2 text-xs rounded-full border border-line bg-white text-ink hover:bg-fog transition-colors font-medium inline-flex items-center justify-center"
            >
              Reset Filters
            </button>
          ) : (
            <Link
              href="/invoices/new"
              className="min-h-[44px] px-5 py-2 text-xs rounded-full bg-ink text-white font-medium hover:bg-ink-hover transition-colors inline-flex items-center justify-center"
            >
              Create First Invoice
            </Link>
          )}
        </div>
      ) : (
        <div className="border border-line rounded-[10px] overflow-hidden bg-white">
          {/* A. Desktop High-Density Table (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-fog/30 text-[11px] font-mono uppercase tracking-wider text-ink/60">
                  <th scope="col" className="py-3 px-4 font-normal">Invoice #</th>
                  <th scope="col" className="py-3 px-4 font-normal">Client</th>
                  <th scope="col" className="py-3 px-4 font-normal">Issue Date</th>
                  <th scope="col" className="py-3 px-4 font-normal">Due Date</th>
                  <th scope="col" className="py-3 px-4 font-normal text-right">Amount</th>
                  <th scope="col" className="py-3 px-4 font-normal text-center">Status</th>
                  <th scope="col" className="py-3 px-4 font-normal text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {filteredInvoices.map((inv) => {
                  const isForeign = inv.currency !== baseCurrency;
                  const isPastDue =
                    inv.status !== "PAID" &&
                    inv.status !== "CANCELLED" &&
                    new Date(inv.dueDate).getTime() < new Date().getTime();
                  const canPay = inv.status !== "PAID" && inv.status !== "CANCELLED";

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-fog/30 transition-colors group"
                    >
                      {/* Invoice # */}
                      <td className="py-3 px-4 font-mono font-medium text-ink">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="hover:underline flex items-center gap-1.5 min-h-[44px]"
                        >
                          <span>{inv.invoiceNumber}</span>
                        </Link>
                      </td>

                      {/* Client */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-ink">
                            {inv.client.clientName}
                          </span>
                          <span className="text-[11px] text-ink/50">
                            {inv.client.email}
                          </span>
                        </div>
                      </td>

                      {/* Issue Date */}
                      <td className="py-3 px-4 text-ink/70">
                        {formatDate(inv.issueDate)}
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-4">
                        <span
                          className={
                            isPastDue ? "text-ember font-medium" : "text-ink/70"
                          }
                        >
                          {formatDate(inv.dueDate)}
                        </span>
                      </td>

                      {/* Amount & Dual Currency Display */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-medium text-ink num">
                            {formatMoney(inv.totalAmount, inv.currency)}
                          </span>
                          {isForeign && (
                            <span className="text-[10px] font-mono text-ink/50">
                              ≈ {formatMoney(inv.baseTotalAmount, baseCurrency as any)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <InvoiceStatusBadge status={inv.status} />
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canPay && (
                            <button
                              type="button"
                              onClick={() => setPaymentInvoice(inv)}
                              className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-medium text-ink px-3 py-2 rounded-full border border-line bg-fog hover:bg-fog-2 transition-colors"
                              title="Record Payment"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-moss shrink-0" />
                              <span>Pay</span>
                            </button>
                          )}
                          <button
                            type="button"
                            title="Download PDF"
                            disabled={downloadingId === inv.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPDF(inv);
                            }}
                            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-full border border-line bg-white text-ink/70 hover:text-ink hover:bg-fog transition-colors disabled:opacity-50"
                          >
                            {downloadingId === inv.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-ink/70" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="min-h-[44px] inline-flex items-center gap-1 text-xs font-medium text-ink/70 hover:text-ink px-3.5 py-2 rounded-full border border-line hover:bg-fog transition-colors"
                          >
                            <span>Manage</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* B. Mobile Card Stack Layout (< 768px) with min 44px Touch Targets */}
          <div className="md:hidden divide-y divide-line">
            {filteredInvoices.map((inv) => {
              const isForeign = inv.currency !== baseCurrency;
              const isPastDue =
                inv.status !== "PAID" &&
                inv.status !== "CANCELLED" &&
                new Date(inv.dueDate).getTime() < new Date().getTime();
              const canPay = inv.status !== "PAID" && inv.status !== "CANCELLED";

              return (
                <div
                  key={inv.id}
                  className="flex flex-col gap-3 p-4 hover:bg-fog/20 transition-colors"
                >
                  {/* Card Header: Invoice Number & Status Badge */}
                  <div className="flex items-center justify-between gap-2 min-h-[44px]">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="min-h-[44px] inline-flex items-center font-mono font-medium text-sm text-ink hover:underline truncate"
                    >
                      {inv.invoiceNumber}
                    </Link>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>

                  {/* Card Client & Amount */}
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm text-ink truncate">
                        {inv.client.clientName}
                      </span>
                      <span className="text-xs text-ink/50 truncate">
                        {inv.client.email}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-semibold text-sm text-ink num">
                        {formatMoney(inv.totalAmount, inv.currency)}
                      </div>
                      {isForeign && (
                        <div className="text-[10px] font-mono text-ink/50">
                          ≈ {formatMoney(inv.baseTotalAmount, baseCurrency as any)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Meta: Due Date */}
                  <div className="flex items-center justify-between pt-2 border-t border-line/60 text-xs text-ink/60">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-ink/40 shrink-0" />
                      <span>Due {formatDate(inv.dueDate)}</span>
                      {isPastDue && (
                        <span className="text-ember font-medium ml-1">
                          (Past Due)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Action Buttons (>= 44px Touch Targets) */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {canPay && (
                      <button
                        type="button"
                        onClick={() => setPaymentInvoice(inv)}
                        className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium bg-fog text-ink hover:bg-fog-2 border border-line transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4 text-moss shrink-0" />
                        <span>Mark Paid</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={downloadingId === inv.id}
                      onClick={() => handleDownloadPDF(inv)}
                      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full border border-line bg-white text-ink/70 hover:text-ink hover:bg-fog transition-colors disabled:opacity-50 text-xs font-medium"
                      title="Download PDF"
                    >
                      {downloadingId === inv.id ? (
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      ) : (
                        <Download className="w-4 h-4 shrink-0" />
                      )}
                      <span>PDF</span>
                    </button>

                    <Link
                      href={`/invoices/${inv.id}`}
                      className="min-h-[44px] inline-flex items-center justify-center gap-1 text-xs font-medium text-ink bg-fog hover:bg-fog-2 px-3.5 py-2 rounded-full border border-line transition-colors"
                    >
                      <span>Manage</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Meta Summary */}
      <div className="flex items-center justify-between text-xs text-ink/50 px-1">
        <span>
          Showing {filteredInvoices.length} of {initialInvoices.length} invoices
        </span>
        <span className="font-mono text-[11px]">
          Base Currency: {baseCurrency}
        </span>
      </div>

      {/* Record Customer Payment Modal */}
      {paymentInvoice && (
        <RecordPaymentModal
          isOpen={Boolean(paymentInvoice)}
          onClose={() => setPaymentInvoice(null)}
          invoiceId={paymentInvoice.id}
          invoiceNumber={paymentInvoice.invoiceNumber}
          totalAmount={paymentInvoice.totalAmount}
          paidAmount={paymentInvoice.paidAmount}
          currency={paymentInvoice.currency}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

// Named alias export for InvoiceListView
export const InvoiceListView = InvoiceDirectoryView;
