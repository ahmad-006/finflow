"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
  ArrowUpDown,
  LayoutGrid,
  List,
  Upload,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import type { ClientRecord, ClientWithMetrics, ARAgingBuckets, ClientRiskStatus } from "@/modules/clients/types";
import { deleteClientAction } from "@/modules/clients/actions";
import { canMutateLedger } from "@/modules/auth/rbac";
import { formatUserError } from "@/lib/errors";
import { ARAgingBar } from "./ARAgingBar";
import { CreateClientModal } from "./CreateClientModal";
import { BulkImportClientsModal } from "./BulkImportClientsModal";
import { ConfirmModal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Money } from "@/components/data/Money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ClientDirectoryViewProps {
  initialClients: ClientWithMetrics[];
  aging: ARAgingBuckets;
  currency?: string;
  role?: string;
}

type SortField = "name" | "latency" | "outstanding" | "createdAt";

export function ClientDirectoryView({
  initialClients,
  aging,
  currency = "PKR",
  role = "MEMBER",
}: ClientDirectoryViewProps) {
  const router = useRouter();
  const canMutate = canMutateLedger(role);

  const [addedClients, setAddedClients] = React.useState<ClientWithMetrics[]>([]);
  const [editedClients, setEditedClients] = React.useState<Record<string, ClientRecord>>({});
  const [deletedIds, setDeletedIds] = React.useState<string[]>([]);

  const clients = React.useMemo(() => {
    const serverIds = new Set(initialClients.map((c) => c.id));
    const pendingAdditions = addedClients.filter((c) => !serverIds.has(c.id));
    return [...pendingAdditions, ...initialClients]
      .filter((c) => !deletedIds.includes(c.id))
      .map((c) => (editedClients[c.id] ? { ...c, ...editedClients[c.id] } : c));
  }, [initialClients, addedClients, editedClients, deletedIds]);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRisk, setSelectedRisk] = React.useState<"ALL" | ClientRiskStatus>("ALL");
  const [sortBy, setSortBy] = React.useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = React.useState<"grid" | "table">("grid");
  const [page, setPage] = React.useState(1);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [clientToEdit, setClientToEdit] = React.useState<ClientWithMetrics | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const [clientToDelete, setClientToDelete] = React.useState<ClientWithMetrics | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [banner, setBanner] = React.useState<{ text: string; isError?: boolean } | null>(null);

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
        if (selectedRisk !== "ALL" && client.metrics.riskStatus !== selectedRisk) {
          return false;
        }

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

  const clientPageSize = 24;
  const totalClientPages = Math.max(1, Math.ceil(filteredClients.length / clientPageSize));
  const safeClientPage = Math.min(page, totalClientPages);
  const paginatedClients = React.useMemo(() => {
    const start = (safeClientPage - 1) * clientPageSize;
    return filteredClients.slice(start, start + clientPageSize);
  }, [filteredClients, safeClientPage]);

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "name" ? "asc" : "desc");
    }
  }

  async function handleConfirmDelete() {
    if (!clientToDelete) return;
    setDeleteError(null);
    setIsDeleting(true);

    try {
      const result = await deleteClientAction(clientToDelete.id);
      if (!result.success) {
        setDeleteError(result.error || "Failed to delete client.");
      } else {
        setDeletedIds((prev) => [...prev, clientToDelete.id]);
        setBanner({
          text: `Removed ${clientToDelete.clientName} from active directory.`,
          isError: false,
        });
        setClientToDelete(null);
        router.refresh();
      }
    } catch (err) {
      setDeleteError(
        formatUserError(err, "Unable to delete client. Please check your connection.")
      );
    } finally {
      setIsDeleting(false);
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

        {canMutate && (
          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0 w-full sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              size="default"
              onClick={() => setIsImportModalOpen(true)}
              className="min-h-[44px] h-11 px-4 rounded-full border border-line bg-white hover:bg-fog text-sm flex-1 sm:flex-initial"
            >
              <Upload className="h-4 w-4 shrink-0" />
              <span>Import CSV</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="default"
              onClick={() => setIsModalOpen(true)}
              className="min-h-[44px] h-11 px-5 rounded-full text-sm flex-1 sm:flex-initial"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Add Client</span>
            </Button>
          </div>
        )}
      </div>

      {/* Inline Feedback Banner */}
      {banner && (
        <div
          className={cn(
            "flex items-center justify-between gap-3 px-4 py-3 rounded-[10px] border text-xs",
            banner.isError
              ? "border-ember/30 bg-ember-tint text-ember-ink"
              : "border-moss/30 bg-moss-tint text-moss"
          )}
        >
          <div className="flex items-center gap-2">
            {banner.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            aria-label="Dismiss message"
            className="p-1 rounded-full hover:bg-white/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Client KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 py-4 border-y border-line">
        <div className="flex flex-col gap-1 p-2 min-w-0">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-3 truncate">
            Total Receivables
          </span>
          <div className="text-lg sm:text-2xl font-serif tracking-tight text-ink num truncate">
            <Money amount={aging.totalOutstanding} currency={currency} />
          </div>
          <span className="text-[11px] text-ink-3">
            {clients.length} billing profiles
          </span>
        </div>

        <div className="flex flex-col gap-1 p-2 min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-3">
              Outstanding
            </span>
            {aging.totalOverdue > 0 && (
              <span className="text-[11px] font-mono text-ember-ink font-medium whitespace-nowrap">
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

        <div className="flex flex-col gap-1 p-2 min-w-0">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-3 truncate">
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
            Weighted portfolio avg
          </span>
        </div>

        <div className="flex flex-col gap-1 p-2 min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-3">
              Overdue
            </span>
            {overdueAccountsCount > 0 && (
              <span className="text-[11px] font-mono text-ember-ink font-medium whitespace-nowrap">
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

      {/* 5. Client Directory Listing */}
      {filteredClients.length > 0 ? (
        <>
          <div
            className={cn(
              "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
              viewMode === "table" ? "lg:hidden" : ""
            )}
          >
            {paginatedClients.map((client) => {
              const latency = client.metrics.avgPaymentDelayDays;

              return (
                <div
                  key={client.id}
                  className="flex flex-col justify-between p-4 rounded-[10px] border border-line bg-white hover:border-line-strong transition-colors gap-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-[15px] font-semibold text-ink hover:underline truncate py-0.5 inline-block"
                      >
                        {client.clientName}
                      </Link>
                      <span className="text-xs text-ink-3 truncate">
                        {client.email}
                      </span>
                    </div>
                    <StatusBadge status={client.metrics.riskStatus} className="shrink-0" />
                  </div>

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

                  <div className="flex items-center gap-2 pt-1 border-t border-line/60">
                    <Link
                      href={`/clients/${client.id}`}
                      className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium text-ink bg-fog hover:bg-fog-2 border border-line transition-colors"
                    >
                      <span>Statement</span>
                      <ChevronRight className="h-3.5 w-3.5 text-ink-3" />
                    </Link>

                    {canMutate && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setClientToEdit(client);
                            setIsModalOpen(true);
                          }}
                          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-fog border border-line transition-colors"
                          title="Edit Client"
                          aria-label={`Edit ${client.clientName}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setClientToDelete(client);
                          }}
                          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ember-ink hover:bg-ember-tint border border-line transition-colors"
                          title="Remove Client"
                          aria-label={`Remove ${client.clientName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

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
                  {paginatedClients.map((client) => {
                    const latency = client.metrics.avgPaymentDelayDays;
                    return (
                      <tr
                        key={client.id}
                        className="group hover:bg-fog/50 transition-colors"
                      >
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

                        <td className="py-4 px-4 whitespace-nowrap text-xs text-ink-2 font-mono">
                          Net {client.paymentTermsDays}
                        </td>

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

                        <td className="py-4 px-4 whitespace-nowrap text-right font-medium">
                          <Money
                            amount={client.metrics.outstandingBalance}
                            currency={currency}
                          />
                        </td>

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

                        <td className="py-4 px-4 whitespace-nowrap text-center">
                          <StatusBadge status={client.metrics.riskStatus} />
                        </td>

                        <td className="py-4 pl-4 pr-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/clients/${client.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-ink bg-fog hover:bg-fog-2 transition-colors border border-line"
                            >
                              <span>Statement</span>
                              <ChevronRight className="h-3 w-3" />
                            </Link>

                            {canMutate && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setClientToEdit(client);
                                    setIsModalOpen(true);
                                  }}
                                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-1.5 rounded-full text-ink-3 hover:text-ink hover:bg-fog transition-colors"
                                  title="Edit Client"
                                  aria-label={`Edit ${client.clientName}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteError(null);
                                    setClientToDelete(client);
                                  }}
                                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-1.5 rounded-full text-ink-3 hover:text-ember-ink hover:bg-ember-tint transition-colors"
                                  title="Remove Client"
                                  aria-label={`Remove ${client.clientName}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-ink-3 px-1">
            <span>
              Showing {(safeClientPage - 1) * clientPageSize + 1}–
              {(safeClientPage - 1) * clientPageSize + paginatedClients.length} of{" "}
              {filteredClients.length} clients
            </span>
            {totalClientPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safeClientPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="min-h-[44px] inline-flex items-center gap-1 px-3.5 py-2 rounded-full border border-line bg-white text-ink hover:bg-fog transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <span className="font-mono text-[11px] px-2 text-ink-2">
                  Page {safeClientPage} of {totalClientPages}
                </span>
                <button
                  type="button"
                  disabled={safeClientPage >= totalClientPages}
                  onClick={() => setPage((p) => Math.min(totalClientPages, p + 1))}
                  className="min-h-[44px] inline-flex items-center gap-1 px-3.5 py-2 rounded-full border border-line bg-white text-ink hover:bg-fog transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
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
              {canMutate && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
                  <Button
                    variant="secondary"
                    size="compact"
                    onClick={() => setIsImportModalOpen(true)}
                    className="min-h-[44px] px-5 rounded-full border border-line bg-white"
                  >
                    <Upload className="h-4 w-4" />
                    Import CSV
                  </Button>
                  <Button
                    variant="primary"
                    size="compact"
                    onClick={() => setIsModalOpen(true)}
                    className="min-h-[44px] px-5 rounded-full inline-flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Your First Client
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Client Modal */}
      {canMutate && (
        <CreateClientModal
          isOpen={isModalOpen}
          clientToEdit={clientToEdit}
          onClose={() => {
            setIsModalOpen(false);
            setClientToEdit(null);
          }}
          onSuccess={(savedClient) => {
            if (clientToEdit) {
              setEditedClients((prev) => ({
                ...prev,
                [savedClient.id]: savedClient,
              }));
              setBanner({
                text: `Updated client "${savedClient.clientName}".`,
                isError: false,
              });
            } else {
              setAddedClients((prev) => [
                {
                  ...savedClient,
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
              setBanner({
                text: `Added client "${savedClient.clientName}".`,
                isError: false,
              });
            }
            setClientToEdit(null);
            router.refresh();
          }}
        />
      )}

      {/* Bulk CSV Import Modal */}
      {canMutate && (
        <BulkImportClientsModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          existingClientEmails={clients.map((c) => c.email)}
          onSuccess={(result) => {
            if (result.createdCount > 0) {
              setBanner({
                text: `Imported ${result.createdCount} ${
                  result.createdCount === 1 ? "client" : "clients"
                }${result.skippedCount > 0 ? ` (${result.skippedCount} skipped)` : ""}.`,
                isError: false,
              });
              router.refresh();
            }
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(clientToDelete)}
        onClose={() => {
          if (!isDeleting) {
            setClientToDelete(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        variant="danger"
        eyebrow="Client Directory"
        title={clientToDelete ? `Remove ${clientToDelete.clientName}?` : "Remove Client"}
        description="Historical invoices and ledger statements will remain intact, but this client will be archived from your active directory."
        confirmLabel="Remove Client"
        cancelLabel="Cancel"
        isPending={isDeleting}
        errorMessage={deleteError}
      />
    </div>
  );
}

export const ClientListView = ClientDirectoryView;
