"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, ChevronRight, Trash2, ArrowUpDown } from "lucide-react";
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

interface ClientDirectoryViewProps {
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
    <div className="flex flex-col gap-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-ink-3">
            Accounts Receivable Ledger
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-ink mt-0.5">
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
          className="self-start sm:self-auto shrink-0"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Client
        </Button>
      </div>

      {/* 2. Accounts Receivable Aging Schedule Bar */}
      <ARAgingBar aging={aging} currency={currency} />

      {/* 3. Toolbar: Search + Risk Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Risk Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2 sm:mx-0 sm:px-0 shrink-0">
          <button
            type="button"
            onClick={() => setSelectedRisk("ALL")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
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
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
              selectedRisk === "HEALTHY"
                ? "bg-moss text-white"
                : "bg-moss-tint text-moss hover:opacity-80"
            )}
          >
            Healthy ({counts.healthy})
          </button>

          <button
            type="button"
            onClick={() => setSelectedRisk("WATCHLIST")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
              selectedRisk === "WATCHLIST"
                ? "bg-amber text-white"
                : "bg-amber-tint text-amber hover:opacity-80"
            )}
          >
            Watchlist ({counts.watchlist})
          </button>

          <button
            type="button"
            onClick={() => setSelectedRisk("CRITICAL")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
              selectedRisk === "CRITICAL"
                ? "bg-ember-ink text-white"
                : "bg-ember-tint text-ember-ink hover:opacity-80"
            )}
          >
            Critical ({counts.critical})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-9 pr-4 text-sm rounded-[10px] bg-fog"
          />
        </div>
      </div>

      {/* 4. Client Directory Listing */}
      {filteredClients.length > 0 ? (
        <>
          {/* Mobile Card Stack */}
          <div className="lg:hidden divide-y divide-line/60 border-t border-b border-line">
            {filteredClients.map((client) => {
              const latency = client.metrics.avgPaymentDelayDays;
              return (
                <div key={client.id} className="py-4 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/clients/${client.id}`}
                      className="group flex flex-col min-w-0"
                    >
                      <span className="text-[15px] font-semibold text-ink group-hover:underline truncate">
                        {client.clientName}
                      </span>
                      <span className="text-xs text-ink-3 truncate">
                        {client.email}
                      </span>
                    </Link>
                    <StatusBadge status={client.metrics.riskStatus} />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <div className="flex items-center gap-2.5 text-ink-2">
                      <span className="font-mono bg-fog px-2 py-0.5 rounded-full text-[11px]">
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
                        <span className="text-ink-3">No history</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-ink-3 block">
                          Outstanding
                        </span>
                        <span className="font-semibold text-ink text-sm">
                          <Money
                            amount={client.metrics.outstandingBalance}
                            currency={currency}
                          />
                        </span>
                      </div>
                      <Link
                        href={`/clients/${client.id}`}
                        className="p-1.5 text-ink-3 hover:text-ink hover:bg-fog rounded-full transition-colors ml-1"
                        aria-label={`View ${client.clientName} statement`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>

                  {client.metrics.overdueAmount > 0 && (
                    <div className="flex items-center justify-between text-xs px-2.5 py-1 rounded-[8px] bg-ember-tint/60 text-ember-ink">
                      <span>Overdue delinquency:</span>
                      <span className="font-semibold">
                        <Money
                          amount={client.metrics.overdueAmount}
                          currency={currency}
                        />
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop & Tablet Table */}
          <div className="hidden lg:block overflow-x-auto border-t border-b border-line">
            <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-medium uppercase tracking-[0.06em] text-ink-3">
                <th className="py-3.5 pl-2 pr-4">
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
                  >
                    Client Profile
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4">Terms</th>
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort("latency")}
                    className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
                  >
                    Payment Latency
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("outstanding")}
                    className="inline-flex items-center gap-1.5 hover:text-ink transition-colors ml-auto"
                  >
                    Outstanding
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4 text-right">Overdue</th>
                <th className="py-3.5 px-4 text-center">Credit Risk</th>
                <th className="py-3.5 pl-4 pr-2 text-right">Actions</th>
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
                    <td className="py-4 pl-2 pr-4">
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
                    <td className="py-4 pl-4 pr-2 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/clients/${client.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-ink bg-fog hover:bg-fog-2 transition-colors"
                        >
                          Statement
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
                className="mt-3"
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
                className="mt-3"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Your First Client
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 5. Create Client Modal */}
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
