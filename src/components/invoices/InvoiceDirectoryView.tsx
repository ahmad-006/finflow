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

interface InvoiceDirectoryViewProps {
  initialInvoices: InvoiceWithItemsAndClient[];
  kpis: InvoiceKPIs;
  baseCurrency?: string;
}

export function InvoiceDirectoryView({
  initialInvoices,
  kpis,
  baseCurrency = "PKR",
}: InvoiceDirectoryViewProps) {
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
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-ink text-white text-sm font-medium hover:bg-ink/90 transition-colors self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Invoice</span>
        </Link>
      </div>

      {/* 2. Executive KPI Strip */}
      <InvoiceKPIStrip kpis={kpis} baseCurrency={baseCurrency} />

      {/* 3. Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${
                  isActive
                    ? "bg-ink text-white"
                    : "bg-fog text-ink/70 hover:bg-fog-2 hover:text-ink"
                }`}
              >
                <span>{status === "ALL" ? "All Invoices" : status.charAt(0) + status.slice(1).toLowerCase()}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-white text-ink/60"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Currency Selector & Search Input */}
        <div className="flex items-center gap-2">
          {/* Currency Dropdown Filter */}
          <div className="relative shrink-0">
            <select
              aria-label="Filter by currency"
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs font-mono rounded-[8px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
            >
              <option value="ALL">All Currencies</option>
              {SUPPORTED_CURRENCIES.map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </select>
            <Filter className="w-3 h-3 text-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search invoice or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-[8px] border border-line bg-white text-ink placeholder:text-ink/40 focus:outline-none focus:border-ink/50"
            />
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
          {(search || statusFilter !== "ALL" || currencyFilter !== "ALL") ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setCurrencyFilter("ALL");
              }}
              className="px-4 py-1.5 text-xs rounded-full border border-line bg-white text-ink hover:bg-fog transition-colors"
            >
              Reset Filters
            </button>
          ) : (
            <Link
              href="/invoices/new"
              className="px-4 py-2 text-xs rounded-full bg-ink text-white font-medium hover:bg-ink/90 transition-colors"
            >
              Create First Invoice
            </Link>
          )}
        </div>
      ) : (
        <div className="border border-line rounded-[10px] overflow-hidden bg-white">
          {/* A. Desktop High-Density Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-fog/30 text-[11px] font-mono uppercase tracking-wider text-ink/60">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {filteredInvoices.map((inv) => {
                  const isForeign = inv.currency !== baseCurrency;
                  const isPastDue =
                    inv.status !== "PAID" &&
                    inv.status !== "CANCELLED" &&
                    new Date(inv.dueDate).getTime() < new Date().getTime();

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-fog/30 transition-colors group"
                    >
                      {/* Invoice # */}
                      <td className="py-3 px-4 font-mono font-medium text-ink">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="hover:underline flex items-center gap-1.5"
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
                          <span className="font-mono font-medium text-ink">
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
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-ink/70 hover:text-ink px-2.5 py-1 rounded-full border border-line hover:bg-fog transition-colors"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* B. Mobile Card Stack Layout */}
          <div className="md:hidden divide-y divide-line">
            {filteredInvoices.map((inv) => {
              const isForeign = inv.currency !== baseCurrency;
              const isPastDue =
                inv.status !== "PAID" &&
                inv.status !== "CANCELLED" &&
                new Date(inv.dueDate).getTime() < new Date().getTime();

              return (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="flex flex-col gap-2.5 p-4 hover:bg-fog/20 transition-colors block"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-sm text-ink">
                      {inv.invoiceNumber}
                    </span>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink">
                      {inv.client.clientName}
                    </span>
                    <div className="text-right">
                      <div className="font-mono font-semibold text-ink">
                        {formatMoney(inv.totalAmount, inv.currency)}
                      </div>
                      {isForeign && (
                        <div className="text-[10px] font-mono text-ink/50">
                          ≈ {formatMoney(inv.baseTotalAmount, baseCurrency as any)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-line/50 text-[11px] text-ink/50">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-ink/40" />
                      <span>Due {formatDate(inv.dueDate)}</span>
                      {isPastDue && (
                        <span className="text-ember font-medium ml-1">
                          (Past Due)
                        </span>
                      )}
                    </div>
                    <span className="text-ink font-medium flex items-center gap-0.5">
                      View details
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
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
    </div>
  );
}
