"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ChevronRight,
  Trash2,
  ArrowUpDown,
  LayoutGrid,
  List,
} from "lucide-react";
import type { ClientWithMetrics, ARAgingBuckets, ClientRiskStatus } from "@/modules/clients/types";
import { deleteClientAction } from "@/modules/clients/actions";
import { formatUserError } from "@/lib/errors";
import { ARAgingBar } from "./ARAgingBar";
import { CreateClientModal } from "./CreateClientModal";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Money } from "@/components/data/Money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ClientDirectoryViewProps {
  initialClients: ClientWithMetrics[];
  aging: ARAgingBuckets;
  currency?: string;
}

type SortField = "name" | "latency" | "outstanding" | "createdAt";

export function ClientDirectoryView({
  initialClients,
  aging,
  currency = "PKR",
}: ClientDirectoryViewProps) {
  const [clients, setClients] = React.useState<ClientWithMetrics[]>(initialClients);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRisk, setSelectedRisk] = React.useState<"ALL" | ClientRiskStatus>("ALL");
  const [sortBy, setSortBy] = React.useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = React.useState<"grid" | "table">("grid");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [deletePendingId, setDeletePendingId] = React.useState<string | null>(null);

  // Sync state if initialClients change via server revalidation
  React.useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  // Risk counts
  const counts = React.useMemo(() => {
    return {
      all: clients.length,
      healthy: clients.filter((c) => c.metrics.riskStatus === "HEALTHY").length,
      watchlist: clients.filter((c) => c.metrics.riskStatus === "WATCHLIST").length,
      critical: clients.filter((c) => c.metrics.riskStatus === "CRITICAL").length,
    };
  }, [clients]);

  // Aggregate KPI Calculations
  const totalOutstandingInvoices = React.useMemo(() => {
    return clients.reduce(
      (acc, c) => acc + (c.metrics.openInvoicesCount || 0) + (c.metrics.overdueInvoicesCount || 0),
      0
    );
  }, [clients]);

  const avgPaymentLatency = React.useMemo(() => {
    const clientsWithHistory = clients.filter((c) => c.metrics.settledInvoicesCount > 0);
    if (!clientsWithHistory.length) return 0;
    const total = clientsWithHistory.reduce((acc, c) => acc + c.metrics.avgPaymentDelayDays, 0);
    return total / clientsWithHistory.length;
  }, [clients]);

  const overdueAccountsCount = React.useMemo(() => {
    return clients.filter((c) => c.metrics.overdueAmount > 0).length;
  }, [clients]);

  // Filtered & Sorted Clients
  const filteredClients = React.useMemo(() => {
    return clients
      .filter((client) => {
        // Risk Filter
        if (selectedRisk !== "ALL" && client.metrics.riskStatus !== selectedRisk) {
          return false;
        }

        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = client.clientName.toLowerCase().includes(q);
          const matchEmail = client.email.toLowerCase().includes(q);
          const matchPhone = client.phone ? client.phone.toLowerCase().includes(q) : false;
          if (!matchName && !matchEmail && !matchPhone) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === "name") {
          diff = a.clientName.localeCompare(b.clientName);
        } else if (sortBy === "latency") {
          diff = a.metrics.avgPaymentDelayDays - b.metrics.avgPaymentDelayDays;
        } else if (sortBy === "outstanding") {
          diff = a.metrics.outstandingBalance - b.metrics.outstandingBalance;
        } else {
          diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return sortOrder === "asc" ? diff : -diff;
      });
  }, [clients, searchQuery, selectedRisk, sortBy, sortOrder]);

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "name" ? "asc" : "desc");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to remove ${name}? Historical invoices will remain intact.`)) {
      return;
    }

    try {
      setDeletePendingId(id);
      const result = await deleteClientAction(id);
      setDeletePendingId(null);

      if (result.success) {
        setClients((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert(result.error || "Failed to delete client.");
      }
    } catch (err) {
      setDeletePendingId(null);
      alert(formatUserError(err, "Unable to delete client. Please check your connection."));
    }
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-ink-3">
            Accounts Receivable Ledger
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-ink mt-0.5 font-serif">
            Clients
          </h1>
          <p className="text-sm text-ink-2 mt-1">
            Directory of corporate billing profiles, payment latency scoring, and receivable aging.
          </p>
        </div>

        <Button
          variant="primary"
          size="default"
          onClick={() => setIsModalOpen(true)}
          className="min-h-[44px] px-5 rounded-full self-start sm:self-auto shrink-0 w-full sm:w-auto inline-flex items-center justify-center"
        >
          <Plus className="h-4 w-4 mr-1.5 shrink-0" />
          <span>Add Client</span>
        </Button>
      </div>

      {/* 2. Client KPI Strip (Total Receivables, Outstanding Invoices, Average Payment Latency, Overdue Exposure) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 py-4 border-y border-line">
        {/* KPI 1: Total Receivables */}
        <div className="flex flex-col gap-1 p-2">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-3">
            Total Receivables
          </span>
          <div className="text-lg sm:text-2xl font-serif tracking-tight text-ink num truncate">
            <Money amount={aging.totalOutstanding} currency={currency} />
          </div>
          <span className="text-[11px] text-ink-3">
            {clients.length} billing profiles
          </span>
        </div>

        {/* KPI 2: Outstanding Invoices */}
        <div className="flex flex-col gap-1 p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-3">
              Outstanding Invoices
            </span>
            {aging.totalOverdue > 0 && (
              <span className="text-[11px] font-mono text-ember-ink font-medium">
                Overdue
              </span>
            )}
          </div>
          <div className="text-lg sm:text-2xl font-serif tracking-tight text-ink num truncate">
            {totalOutstandingInvoices} open
          </div>
          <span className="text-[11px] text-ink-3">
            Pending settlement
          </span>
        </div>

        {/* KPI 3: Average Payment Latency */}
        <div className="flex flex-col gap-1 p-2">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-3">
            Payment Latency
          </span>
          <div
            className={cn(
              "text-lg sm:text-2xl font-serif tracking-tight num truncate",
              avgPaymentLatency <= 3
                ? "text-moss"
                : avgPaymentLatency <= 14
                ? "text-amber"
                : "text-ember-ink font-semibold"
            )}
          >
            {avgPaymentLatency <= 0 ? "0.0d (on time)" : `+${avgPaymentLatency.toFixed(1)}d late`}
          </div>
          <span className="text-[11px] text-ink-3">
            Weighted portfolio average
          </span>
        </div>

        {/* KPI 4: Overdue Delinquency */}
        <div className="flex flex-col gap-1 p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-3">
              Overdue Exposure
            </span>
            {overdueAccountsCount > 0 && (
              <span className="text-[11px] font-mono text-ember-ink font-medium">
                {overdueAccountsCount} delayed
              </span>
            )}
          </div>
          <div
            className={cn(
              "text-lg sm:text-2xl font-serif tracking-tight num truncate",
              aging.totalOverdue > 0 ? "text-ember-ink font-semibold" : "text-ink"
            )}
          >
            <Money amount={aging.totalOverdue} currency={currency} />
          </div>
          <span className="text-[11px] text-ink-3">
            Past terms delinquency
          </span>
        </div>
      </div>

      {/* 3. Accounts Receivable Aging Schedule Bar */}
      <ARAgingBar aging={aging} currency={currency} />

      {/* 4. Toolbar: Search, Risk Filter Pills & View Mode Toggle */}
      <div className="flex flex-col gap-3">
        {/* Risk Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2 sm:mx-0 sm:px-0 shrink-0">
          <button
            type="button"
            onClick={() => setSelectedRisk("ALL")}
            className={cn(
              "px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 inline-flex items-center",
              selectedRisk === "ALL"
                ? "bg-ink text-white"
                : "bg-fog text-ink-2 hover:bg-fog-2 hover:text-ink"
            )}
          >
            All Clients ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => setSelectedRisk("HEALTHY")}
            className={cn(
              "px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 inline-flex items-center",
              selectedRisk === "HEALTHY"
                ? "bg-moss text-white"
                : "bg-moss-tint text-moss hover:opacity-80 border border-line"
            )}
          >
            Healthy ({counts.healthy})
          </button>

          <button
            type="button"
            onClick={() => setSelectedRisk("WATCHLIST")}
            className={cn(
              "px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 inline-flex items-center",
              selectedRisk === "WATCHLIST"
                ? "bg-amber text-white"
                : "bg-amber-tint text-amber hover:opacity-80 border border-line"
            )}
          >
            Watchlist ({counts.watchlist})
          </button>

          <button
            type="button"
            onClick={() => setSelectedRisk("CRITICAL")}
            className={cn(
              "px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 inline-flex items-center",
              selectedRisk === "CRITICAL"
                ? "bg-ember-ink text-white"
                : "bg-ember-tint text-ember-ink hover:opacity-80 border border-line"
            )}
          >
            Critical ({counts.critical})
          </button>
        </div>

        {/* Search Input & Desktop View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-10 pr-4 text-xs sm:text-sm rounded-[10px] bg-fog border border-line w-full focus:bg-white"
            />
          </div>

          {/* Desktop Grid vs Table View Mode Switcher */}
          <div className="hidden lg:flex items-center gap-1 border border-line rounded-[10px] p-1 bg-fog/50 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[8px] transition-colors",
                viewMode === "grid"
                  ? "bg-white text-ink border border-line"
                  : "text-ink-3 hover:text-ink"
              )}
              title="Grid View (3 Columns)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[8px] transition-colors",
                viewMode === "table"
                  ? "bg-white text-ink border border-line"
                  : "text-ink-3 hover:text-ink"
              )}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Client Directory Listing: 3-Column Desktop to 1-Column Mobile Grid */}
      {filteredClients.length > 0 ? (
        <>
          {/* Responsive Grid: 1 column on mobile (< 768px), 2 on tablet, 3 columns on desktop */}
          <div
            className={cn(
              "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
              viewMode === "table" ? "lg:hidden" : ""
            )}
          >
            {filteredClients.map((client) => {
              const latency = client.metrics.avgPaymentDelayDays;

              return (
                <div
                  key={client.id}
                  className="flex flex-col justify-between p-4 rounded-[10px] border border-line bg-white hover:border-line-strong transition-colors gap-3.5"
                >
                  {/* Card Header: Client Name, Email & Risk Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-[15px] font-semibold text-ink hover:underline truncate"
                      >
                        {client.clientName}
                      </Link>
                      <span className="text-xs text-ink-3 truncate">
                        {client.email}
                      </span>
                    </div>
                    <StatusBadge status={client.metrics.riskStatus} />
                  </div>

                  {/* Card Terms & Payment Latency */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-line/60">
                    <span className="font-mono bg-fog px-2.5 py-1 rounded-full text-[11px] text-ink-2">
                      Net {client.paymentTermsDays}
                    </span>
                    {client.metrics.settledInvoicesCount > 0 ? (
                      <span
                        className={cn(
                          "font-mono font-medium",
                          latency <= 3
                            ? "text-moss"
                            : latency <= 14
                            ? "text-amber"
                            : "text-ember-ink"
                        )}
                      >
                        {latency <= 0 ? "On time" : `+${latency.toFixed(1)}d late`}
                      </span>
                    ) : (
                      <span className="text-ink-3 font-mono">No history</span>
                    )}
                  </div>

                  {/* Card Balances: Outstanding & Overdue */}
                  <div className="flex items-center justify-between py-2 bg-fog/50 px-3 rounded-[8px] text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-ink-3">
                        Outstanding
                      </span>
                      <span className="font-semibold text-ink text-sm num">
                        <Money
                          amount={client.metrics.outstandingBalance}
                          currency={currency}
                        />
                      </span>
                    </div>

                    {client.metrics.overdueAmount > 0 ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-ember-ink">
                          Overdue
                        </span>
                        <span className="font-semibold text-ember-ink text-sm num">
                          <Money
                            amount={client.metrics.overdueAmount}
                            currency={currency}
                          />
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-ink-3">
                          Status
                        </span>
                        <span className="text-xs text-moss font-medium">Current</span>
                      </div>
                    )}
                  </div>

                  {/* Card Actions with touch targets >= 44px */}
                  <div className="flex items-center gap-2 pt-1 border-t border-line/60">
                    <Link
                      href={`/clients/${client.id}`}
                      className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium text-ink bg-fog hover:bg-fog-2 border border-line transition-colors"
                    >
                      <span>Statement</span>
                      <ChevronRight className="h-3.5 w-3.5 text-ink-3" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDelete(client.id, client.clientName)}
                      disabled={deletePendingId === client.id}
                      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ember-ink hover:bg-ember-tint border border-line transition-colors disabled:opacity-50"
                      title="Remove Client"
                      aria-label={`Remove ${client.clientName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (Only when Table view mode is active on >= 1024px) */}
          {viewMode === "table" && (
            <div className="hidden lg:block overflow-x-auto border-t border-b border-line bg-white rounded-[10px]">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs font-medium uppercase tracking-[0.06em] text-ink-3 bg-fog/30">
                    <th scope="col" className="py-3.5 pl-4 pr-4">
                      <button
                        type="button"
                        onClick={() => handleSort("name")}
                        className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
                      >
                        Client Profile
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th scope="col" className="py-3.5 px-4">Terms</th>
                    <th scope="col" className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleSort("latency")}
                        className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
                      >
                        Payment Latency
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th scope="col" className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort("outstanding")}
                        className="inline-flex items-center gap-1.5 hover:text-ink transition-colors ml-auto"
                      >
                        Outstanding
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th scope="col" className="py-3.5 px-4 text-right">Overdue</th>
                    <th scope="col" className="py-3.5 px-4 text-center">Credit Risk</th>
                    <th scope="col" className="py-3.5 pl-4 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredClients.map((client) => {
                    const latency = client.metrics.avgPaymentDelayDays;
                    return (
                      <tr
                        key={client.id}
                        className="group hover:bg-fog/50 transition-colors"
                      >
                        {/* Client Name & Email */}
                        <td className="py-4 pl-4 pr-4">
                          <Link
                            href={`/clients/${client.id}`}
                            className="font-medium text-ink hover:underline decoration-line-strong underline-offset-2 flex flex-col"
                          >
                            <span className="text-[15px]">{client.clientName}</span>
                            <span className="text-xs text-ink-3 font-normal font-sans">
                              {client.email}
                            </span>
                          </Link>
                        </td>

                        {/* Payment Terms */}
                        <td className="py-4 px-4 whitespace-nowrap text-xs text-ink-2 font-mono">
                          Net {client.paymentTermsDays}
                        </td>

                        {/* Latency */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {client.metrics.settledInvoicesCount > 0 ? (
                            <div className="flex flex-col">
                              <span
                                className={cn(
                                  "text-xs font-medium font-mono",
                                  latency <= 3
                                    ? "text-moss"
                                    : latency <= 14
                                    ? "text-amber"
                                    : "text-ember-ink"
                                )}
                              >
                                {latency <= 0 ? "0.0d (on time)" : `+${latency.toFixed(1)}d late`}
                              </span>
                              <span className="text-[11px] text-ink-3">
                                {client.metrics.settledInvoicesCount} settled
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-ink-3 font-mono">No history</span>
                          )}
                        </td>

                        {/* Outstanding */}
                        <td className="py-4 px-4 whitespace-nowrap text-right font-medium">
                          <Money
                            amount={client.metrics.outstandingBalance}
                            currency={currency}
                          />
                        </td>

                        {/* Overdue */}
                        <td className="py-4 px-4 whitespace-nowrap text-right">
                          <span
                            className={cn(
                              "font-medium",
                              client.metrics.overdueAmount > 0
                                ? "text-ember-ink"
                                : "text-ink-3"
                            )}
                          >
                            <Money
                              amount={client.metrics.overdueAmount}
                              currency={currency}
                            />
                          </span>
                        </td>

                        {/* Risk Badge */}
                        <td className="py-4 px-4 whitespace-nowrap text-center">
                          <StatusBadge status={client.metrics.riskStatus} />
                        </td>

                        {/* Row Actions */}
                        <td className="py-4 pl-4 pr-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/clients/${client.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-ink bg-fog hover:bg-fog-2 transition-colors border border-line"
                            >
                              <span>Statement</span>
                              <ChevronRight className="h-3 w-3" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleDelete(client.id, client.clientName)}
                              disabled={deletePendingId === client.id}
                              className="p-1.5 rounded-full text-ink-3 hover:text-ember-ink hover:bg-ember-tint transition-colors"
                              title="Remove Client"
                              aria-label={`Remove ${client.clientName}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* Empty States */
        <div className="py-16 text-center border-t border-b border-line">
          {searchQuery ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-base font-medium text-ink">No clients match your search</p>
              <p className="text-xs text-ink-3">
                Try searching by a different name, email, or clear the search query.
              </p>
              <Button
                variant="secondary"
                size="compact"
                onClick={() => setSearchQuery("")}
                className="mt-3 min-h-[44px] px-5 rounded-full"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <p className="text-base font-medium text-ink">No clients in directory yet</p>
              <p className="text-xs text-ink-3 max-w-sm">
                Add your clients to issue dynamic invoices, calculate settlement delays, and monitor receivables aging.
              </p>
              <Button
                variant="primary"
                size="compact"
                onClick={() => setIsModalOpen(true)}
                className="mt-3 min-h-[44px] px-5 rounded-full inline-flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Your First Client
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 6. Create Client Modal */}
      <CreateClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newClient) => {
          // Immediately append new client to local view
          setClients((prev) => [
            {
              ...newClient,
              metrics: {
                totalBilled: 0,
                totalPaid: 0,
                outstandingBalance: 0,
                overdueAmount: 0,
                avgPaymentDelayDays: 0,
                settledInvoicesCount: 0,
                openInvoicesCount: 0,
                overdueInvoicesCount: 0,
                riskStatus: "HEALTHY",
              },
            },
            ...prev,
          ]);
        }}
      />
    </div>
  );
}

// Named alias export for ClientListView
export const ClientListView = ClientDirectoryView;
