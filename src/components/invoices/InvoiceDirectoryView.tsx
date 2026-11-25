"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  FileText,
  Calendar,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Loader2,
  CheckCircle2,
  Bell,
  Check,
  Pencil,
  Upload,
} from "lucide-react";
import type {
  InvoiceWithItemsAndClient,
  InvoiceKPIs,
  InvoiceStatus,
  InvoiceCurrency,
} from "@/modules/invoices/types";
import { SUPPORTED_CURRENCIES } from "@/modules/invoices/currency";
import { formatMoney } from "@/lib/format";
import { canManageBilling, canMutateLedger } from "@/modules/auth/rbac";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { InvoiceKPIStrip } from "./InvoiceKPIStrip";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import { BulkImportInvoicesModal } from "./BulkImportInvoicesModal";
import type { ClientOption } from "./InvoiceBuilderView";
import { downloadInvoicePDF } from "@/modules/documents";
import { formatUserError } from "@/lib/errors";
import { sendInvoiceReminderAction } from "@/modules/notifications/actions";
import { Button } from "@/components/ui/button";

export interface InvoiceDirectoryViewProps {
  initialInvoices: InvoiceWithItemsAndClient[];
  kpis: InvoiceKPIs;
  baseCurrency?: string;
  companyName?: string;
  role?: string;
  clients?: ClientOption[];
  initialExchangeRates?: Record<InvoiceCurrency, number>;
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
  initialStatus?: InvoiceStatus | "ALL";
  initialCurrency?: InvoiceCurrency | "ALL";
  initialSearch?: string;
}

const PAGE_LIMIT = 20;

export function InvoiceDirectoryView({
  initialInvoices,
  kpis,
  baseCurrency = "PKR",
  companyName = "FinFlow Commercial Services",
  role = "MEMBER",
  clients = [],
  initialExchangeRates,
  totalCount,
  currentPage = 1,
  totalPages = 1,
  initialStatus = "ALL",
  initialCurrency = "ALL",
  initialSearch = "",
}: InvoiceDirectoryViewProps) {
  const canMutate = canMutateLedger(role);
  const canPayBilling = canManageBilling(role);
  const router = useRouter();
  const [, startFilterTransition] = React.useTransition();
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [sendingReminderId, setSendingReminderId] = React.useState<string | null>(null);
  const [reminderSuccessId, setReminderSuccessId] = React.useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = React.useState<{ text: string; isError?: boolean } | null>(null);
  const [paymentInvoice, setPaymentInvoice] = React.useState<InvoiceWithItemsAndClient | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const [search, setSearch] = React.useState(initialSearch);
  const [statusFilter, setStatusFilter] = React.useState<InvoiceStatus | "ALL">(initialStatus);
  const [currencyFilter, setCurrencyFilter] = React.useState<InvoiceCurrency | "ALL">(initialCurrency);

  const resolvedTotal = totalCount ?? initialInvoices.length;
  const resolvedTotalPages = Math.max(1, totalPages);
  const hasServerQuery =
    resolvedTotalPages > 1 ||
    resolvedTotal > initialInvoices.length ||
    initialStatus !== "ALL" ||
    initialCurrency !== "ALL" ||
    initialSearch !== "";

  const pushFilterRoute = React.useCallback(
    (next: {
      page?: number;
      status?: InvoiceStatus | "ALL";
      currency?: InvoiceCurrency | "ALL";
      search?: string;
    }) => {
      const params = new URLSearchParams();
      if (next.page && next.page > 1) params.set("page", String(next.page));
      if (next.status && next.status !== "ALL") params.set("status", next.status);
      if (next.currency && next.currency !== "ALL") params.set("currency", next.currency);
      if (next.search && next.search.trim()) params.set("search", next.search.trim());
      const qs = params.toString();
      startFilterTransition(() => {
        router.push(qs ? `/invoices?${qs}` : "/invoices");
      });
    },
    [router]
  );

  React.useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // Client-side instant filtering
  const filteredInvoices = React.useMemo(() => {
    return initialInvoices.filter((inv) => {
      if (statusFilter !== "ALL" && inv.status !== statusFilter) {
        return false;
      }

      if (currencyFilter !== "ALL" && inv.currency !== currencyFilter) {
        return false;
      }

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
    setFeedbackMessage(null);
    setDownloadingId(inv.id);
    try {
      await new Promise((resolve) => setTimeout(resolve, 60));
      downloadInvoicePDF(inv, {
        companyName,
        baseCurrency,
      });
    } catch (err) {
      console.error("Quick PDF download failed:", err);
      setFeedbackMessage({
        text: formatUserError(err, `Unable to generate PDF for ${inv.invoiceNumber}.`),
        isError: true,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSendReminder = async (inv: InvoiceWithItemsAndClient) => {
    setFeedbackMessage(null);
    setSendingReminderId(inv.id);
    try {
      const res = await sendInvoiceReminderAction(inv.id);
      if (!res.success) {
        setFeedbackMessage({
          text: res.error || "Failed to dispatch payment reminder.",
          isError: true,
        });
      } else {
        setReminderSuccessId(inv.id);
        setFeedbackMessage({
          text: `Reminder dispatched to ${inv.client.email} for ${inv.invoiceNumber}. Advise the recipient to check their spam folder if not received.`,
          isError: false,
        });
        setTimeout(() => setReminderSuccessId(null), 3000);
        setTimeout(() => setFeedbackMessage(null), 5000);
        router.refresh();
      }
    } catch (err) {
      setFeedbackMessage({
        text: formatUserError(
          err,
          "Unable to send payment reminder. Please check your connection."
        ),
        isError: true,
      });
    } finally {
      setSendingReminderId(null);
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

        {canMutate && (
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] h-11 rounded-full border border-line bg-white hover:bg-fog text-sm font-medium flex-1 sm:flex-initial"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span>Import CSV</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] h-11 rounded-full text-sm font-medium flex-1 sm:flex-initial"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>New Invoice</span>
            </Button>
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-[10px] border text-xs flex items-center justify-between gap-2 ${
            feedbackMessage.isError
              ? "border-ember/30 bg-ember-tint text-ember-ink"
              : "border-moss/30 bg-moss-tint text-moss"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.isError ? (
              <span className="font-semibold">Notice:</span>
            ) : (
              <Check className="w-3.5 h-3.5 shrink-0 text-moss" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-xs opacity-60 hover:opacity-100 p-1 min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Executive KPI Strip */}
      <InvoiceKPIStrip kpis={kpis} baseCurrency={baseCurrency} />

      {/* 3. Filter & Search Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
          {(["ALL", "DRAFT", "SENT", "PAID", "OVERDUE"] as const).map((status) => {
            const isActive = statusFilter === status;
            const count = statusCounts[status] ?? 0;
            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  if (hasServerQuery) {
                    pushFilterRoute({
                      page: 1,
                      status,
                      currency: currencyFilter,
                      search,
                    });
                  }
                }}
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

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-ink/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search invoice or client..."
              value={search}
              onChange={(e) => {
                const nextSearch = e.target.value;
                setSearch(nextSearch);
                if (hasServerQuery) {
                  if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                  searchDebounceRef.current = setTimeout(() => {
                    pushFilterRoute({
                      page: 1,
                      status: statusFilter,
                      currency: currencyFilter,
                      search: nextSearch,
                    });
                  }, 300);
                }
              }}
              className="w-full pl-10 pr-4 h-11 text-xs sm:text-sm rounded-[10px] border border-line bg-white text-ink placeholder:text-ink/40 focus:outline-none focus:border-ink/50 transition-colors"
            />
          </div>

          <div className="relative w-full sm:w-auto shrink-0">
            <select
              aria-label="Filter by currency"
              value={currencyFilter}
              onChange={(e) => {
                const nextCurrency = e.target.value as InvoiceCurrency | "ALL";
                setCurrencyFilter(nextCurrency);
                if (hasServerQuery) {
                  pushFilterRoute({
                    page: 1,
                    status: statusFilter,
                    currency: nextCurrency,
                    search,
                  });
                }
              }}
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
                if (hasServerQuery) {
                  pushFilterRoute({ page: 1, status: "ALL", currency: "ALL", search: "" });
                }
              }}
              className="min-h-[44px] px-5 py-2 text-xs rounded-full border border-line bg-white text-ink hover:bg-fog transition-colors font-medium inline-flex items-center justify-center"
            >
              Reset Filters
            </button>
          ) : canMutate ? (
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsImportModalOpen(true)}
                className="min-h-[44px] px-5 py-2 text-xs rounded-full border border-line bg-white"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => setIsCreateModalOpen(true)}
                className="min-h-[44px] px-5 py-2 text-xs rounded-full"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Invoice</span>
              </Button>
            </div>
          ) : null}
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
                  const canPay = canPayBilling && inv.status !== "PAID" && inv.status !== "CANCELLED";
                  const canRemind = canMutate && (inv.status === "SENT" || inv.status === "OVERDUE");

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-fog/30 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-ink">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="hover:underline flex items-center gap-1.5 min-h-[44px]"
                        >
                          <span>{inv.invoiceNumber}</span>
                        </Link>
                      </td>

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

                      <td className="py-3 px-4 text-ink/70">
                        {formatDate(inv.issueDate)}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={
                            isPastDue ? "text-ember font-medium" : "text-ink/70"
                          }
                        >
                          {formatDate(inv.dueDate)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-medium text-ink num">
                            {formatMoney(inv.totalAmount, inv.currency)}
                          </span>
                          {isForeign && (
                            <span className="text-[10px] font-mono text-ink/50">
                              ≈ {formatMoney(inv.baseTotalAmount, baseCurrency)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <InvoiceStatusBadge status={inv.status} />
                      </td>

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
                          {canRemind && (
                            <button
                              type="button"
                              title="Send Email Payment Reminder"
                              disabled={sendingReminderId === inv.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendReminder(inv);
                              }}
                              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-full border border-line bg-white text-ink/70 hover:text-ink hover:bg-fog transition-colors disabled:opacity-50"
                            >
                              {sendingReminderId === inv.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-ink/70" />
                              ) : reminderSuccessId === inv.id ? (
                                <Check className="w-3.5 h-3.5 text-moss" />
                              ) : (
                                <Bell className="w-3.5 h-3.5" />
                              )}
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
                            href={inv.status === "DRAFT" && canMutate ? `/invoices/${inv.id}/edit` : `/invoices/${inv.id}`}
                            className="min-h-[44px] inline-flex items-center gap-1 text-xs font-medium text-ink/70 hover:text-ink px-3.5 py-2 rounded-full border border-line hover:bg-fog transition-colors"
                          >
                            {inv.status === "DRAFT" && canMutate ? (
                              <>
                                <Pencil className="w-3 h-3" />
                                <span>Edit</span>
                              </>
                            ) : (
                              <>
                                <span>Manage</span>
                                <ArrowRight className="w-3 h-3" />
                              </>
                            )}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* B. Mobile Card Stack Layout (< 768px) */}
          <div className="md:hidden divide-y divide-line">
            {filteredInvoices.map((inv) => {
              const isForeign = inv.currency !== baseCurrency;
              const isPastDue =
                inv.status !== "PAID" &&
                inv.status !== "CANCELLED" &&
                new Date(inv.dueDate).getTime() < new Date().getTime();
              const canPay = canPayBilling && inv.status !== "PAID" && inv.status !== "CANCELLED";
              const canRemind = canMutate && (inv.status === "SENT" || inv.status === "OVERDUE");

              return (
                <div
                  key={inv.id}
                  className="flex flex-col gap-3 p-4 hover:bg-fog/20 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 min-h-[44px]">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="min-h-[44px] inline-flex items-center font-mono font-medium text-sm text-ink hover:underline truncate"
                    >
                      {inv.invoiceNumber}
                    </Link>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>

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
                          ≈ {formatMoney(inv.baseTotalAmount, baseCurrency)}
                        </div>
                      )}
                    </div>
                  </div>

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

                    {canRemind && (
                      <button
                        type="button"
                        disabled={sendingReminderId === inv.id}
                        onClick={() => handleSendReminder(inv)}
                        className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full border border-line bg-white text-ink/70 hover:text-ink hover:bg-fog transition-colors disabled:opacity-50 text-xs font-medium"
                        title="Send Payment Reminder"
                      >
                        {sendingReminderId === inv.id ? (
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        ) : reminderSuccessId === inv.id ? (
                          <Check className="w-4 h-4 text-moss shrink-0" />
                        ) : (
                          <Bell className="w-4 h-4 shrink-0" />
                        )}
                        <span>{reminderSuccessId === inv.id ? "Sent" : "Remind"}</span>
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
                      href={inv.status === "DRAFT" && canMutate ? `/invoices/${inv.id}/edit` : `/invoices/${inv.id}`}
                      className="min-h-[44px] inline-flex items-center justify-center gap-1 text-xs font-medium text-ink bg-fog hover:bg-fog-2 px-3.5 py-2 rounded-full border border-line transition-colors"
                    >
                      {inv.status === "DRAFT" && canMutate ? (
                        <>
                          <Pencil className="w-3.5 h-3.5 shrink-0" />
                          <span>Edit</span>
                        </>
                      ) : (
                        <>
                          <span>Manage</span>
                          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                        </>
                      )}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Meta Summary & Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-ink/60 px-1">
        <span>
          {resolvedTotal === 0
            ? "Showing 0 invoices"
            : resolvedTotalPages > 1
            ? `Showing ${(currentPage - 1) * PAGE_LIMIT + 1}–${
                (currentPage - 1) * PAGE_LIMIT + filteredInvoices.length
              } of ${resolvedTotal} invoices`
            : `Showing ${filteredInvoices.length} of ${resolvedTotal} invoices`}
        </span>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          {resolvedTotalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() =>
                  pushFilterRoute({
                    page: Math.max(1, currentPage - 1),
                    status: statusFilter,
                    currency: currencyFilter,
                    search,
                  })
                }
                className="min-h-[44px] inline-flex items-center gap-1 px-3.5 py-2 rounded-full border border-line bg-white text-ink hover:bg-fog transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <span className="font-mono text-[11px] px-2 text-ink/70">
                Page {currentPage} of {resolvedTotalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= resolvedTotalPages}
                onClick={() =>
                  pushFilterRoute({
                    page: Math.min(resolvedTotalPages, currentPage + 1),
                    status: statusFilter,
                    currency: currencyFilter,
                    search,
                  })
                }
                className="min-h-[44px] inline-flex items-center gap-1 px-3.5 py-2 rounded-full border border-line bg-white text-ink hover:bg-fog transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <span className="font-mono text-[11px] text-ink/50">
            Base Currency: {baseCurrency}
          </span>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {canMutate && (
        <CreateInvoiceModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          clients={clients}
          baseCurrency={baseCurrency}
          initialExchangeRates={initialExchangeRates}
          onSuccess={(created) => {
            setFeedbackMessage({
              text: `Created invoice ${created.invoiceNumber} for ${created.client.clientName}.`,
              isError: false,
            });
            router.refresh();
          }}
        />
      )}

      {/* Bulk CSV Import Invoices Modal */}
      {canMutate && (
        <BulkImportInvoicesModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          clients={clients}
          baseCurrency={baseCurrency}
          initialExchangeRates={initialExchangeRates}
          onSuccess={(result) => {
            if (result.createdCount > 0) {
              setFeedbackMessage({
                text: `Imported ${result.createdCount} ${
                  result.createdCount === 1 ? "invoice" : "invoices"
                }${
                  result.autoCreatedClientsCount > 0
                    ? ` and created ${result.autoCreatedClientsCount} ${
                        result.autoCreatedClientsCount === 1 ? "client" : "clients"
                      }`
                    : ""
                }.`,
                isError: false,
              });
              router.refresh();
            }
          }}
        />
      )}

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
            setFeedbackMessage({
              text: `Payment recorded for ${paymentInvoice.invoiceNumber}.`,
              isError: false,
            });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

export const InvoiceListView = InvoiceDirectoryView;
