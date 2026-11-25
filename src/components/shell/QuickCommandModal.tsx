"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  LayoutDashboard,
  FileText,
  FilePlus2,
  Users,
  Receipt,
  TrendingUp,
  Calendar,
  SlidersHorizontal,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { canMutateLedger } from "@/modules/auth/rbac";
import {
  quickSearchAction,
  type QuickSearchResult,
} from "@/modules/search/actions";

export interface CockpitShortcut {
  label: string;
  description: string;
  href: string;
  keywords: string;
  requiresMutate?: boolean;
}

export const COCKPIT_SHORTCUTS: readonly CockpitShortcut[] = [
  {
    label: "Overview",
    description: "Treasury summary and cash runway",
    href: "/dashboard",
    keywords: "dashboard home overview summary",
  },
  {
    label: "Invoices",
    description: "Browse issued bills and settlements",
    href: "/invoices",
    keywords: "invoices billing receivables list",
  },
  {
    label: "New invoice",
    description: "Create and send an invoice",
    href: "/invoices/new",
    keywords: "new invoice create bill draft",
    requiresMutate: true,
  },
  {
    label: "Clients",
    description: "Client ledger and payment terms",
    href: "/clients",
    keywords: "clients customers crm accounts",
  },
  {
    label: "Expenses",
    description: "Operating outflows and recurring bills",
    href: "/expenses",
    keywords: "expenses outflows spending bills",
  },
  {
    label: "Cash flow",
    description: "30-day forward liquidity forecast",
    href: "/cash-flow",
    keywords: "cash flow forecast liquidity treasury",
  },
  {
    label: "Calendar",
    description: "Upcoming invoice and expense due dates",
    href: "/calendar",
    keywords: "calendar schedule due dates",
  },
  {
    label: "Settings",
    description: "Company profile, currency, and team",
    href: "/settings",
    keywords: "settings workspace preferences team",
  },
];

const SHORTCUT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/dashboard": LayoutDashboard,
  "/invoices": FileText,
  "/invoices/new": FilePlus2,
  "/clients": Users,
  "/expenses": Receipt,
  "/cash-flow": TrendingUp,
  "/calendar": Calendar,
  "/settings": SlidersHorizontal,
};

function getClientBadgeVariant(status: string): BadgeVariant {
  switch (status.toUpperCase()) {
    case "WATCHLIST":
      return "watchlist";
    case "CRITICAL":
      return "critical";
    default:
      return "healthy";
  }
}

function getInvoiceBadgeVariant(status: string): BadgeVariant {
  switch (status.toUpperCase()) {
    case "SENT":
      return "sent";
    case "PAID":
      return "paid";
    case "OVERDUE":
      return "overdue";
    case "CANCELLED":
      return "cancelled";
    default:
      return "draft";
  }
}

export function filterCockpitShortcuts(
  query: string,
  userRole?: string
): CockpitShortcut[] {
  const canCreate = userRole ? canMutateLedger(userRole) : true;
  const trimmed = query.trim().toLowerCase();

  return COCKPIT_SHORTCUTS.filter((shortcut) => {
    if (shortcut.requiresMutate && !canCreate) {
      return false;
    }
    if (!trimmed) {
      return true;
    }
    return (
      shortcut.label.toLowerCase().includes(trimmed) ||
      shortcut.description.toLowerCase().includes(trimmed) ||
      shortcut.href.toLowerCase().includes(trimmed) ||
      shortcut.keywords.toLowerCase().includes(trimmed)
    );
  });
}

export interface QuickCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

const EMPTY_RESULTS: QuickSearchResult = {
  clients: [],
  invoices: [],
};

export function QuickCommandModal({
  isOpen,
  onClose,
  userRole,
}: QuickCommandModalProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<QuickSearchResult>(EMPTY_RESULTS);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const requestSeqRef = React.useRef(0);

  const handleClose = React.useCallback(() => {
    requestSeqRef.current += 1;
    setQuery("");
    setResults(EMPTY_RESULTS);
    setIsSearching(false);
    setSearchError(null);
    setActiveIndex(0);
    onClose();
  }, [onClose]);

  React.useEffect(() => {
    if (!isOpen) return;
    const frameId = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frameId);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    if (!trimmed) return;

    const currentSeq = ++requestSeqRef.current;
    const timer = setTimeout(async () => {
      try {
        const next = await quickSearchAction(trimmed);
        if (requestSeqRef.current !== currentSeq) return;
        setResults({
          clients: next.clients,
          invoices: next.invoices,
        });
        setSearchError(next.error ?? null);
      } catch {
        if (requestSeqRef.current !== currentSeq) return;
        setResults(EMPTY_RESULTS);
        setSearchError("Unable to complete search right now.");
      } finally {
        if (requestSeqRef.current === currentSeq) {
          setIsSearching(false);
        }
      }
    }, 180);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, query]);

  const matchingRoutes = React.useMemo(
    () => filterCockpitShortcuts(query, userRole),
    [query, userRole]
  );

  const totalItems =
    matchingRoutes.length + results.clients.length + results.invoices.length;

  const clampedActiveIndex =
    totalItems > 0 ? Math.min(activeIndex, totalItems - 1) : -1;

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setQuery(nextValue);
    setActiveIndex(0);

    if (!nextValue.trim()) {
      requestSeqRef.current += 1;
      setResults(EMPTY_RESULTS);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (totalItems === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = (clampedActiveIndex + 1) % totalItems;
      setActiveIndex(nextIndex);
      const item = listRef.current?.querySelectorAll<HTMLAnchorElement>(
        '[data-command-item="true"]'
      )[nextIndex];
      item?.scrollIntoView({ block: "nearest" });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const prevIndex = (clampedActiveIndex - 1 + totalItems) % totalItems;
      setActiveIndex(prevIndex);
      const item = listRef.current?.querySelectorAll<HTMLAnchorElement>(
        '[data-command-item="true"]'
      )[prevIndex];
      item?.scrollIntoView({ block: "nearest" });
      return;
    }

    if (event.key === "Enter" && clampedActiveIndex >= 0) {
      const item = listRef.current?.querySelectorAll<HTMLAnchorElement>(
        '[data-command-item="true"]'
      )[clampedActiveIndex];
      if (item) {
        event.preventDefault();
        item.click();
      }
    }
  };

  const trimmedQuery = query.trim();
  const hasNoResults =
    trimmedQuery.length > 0 && !isSearching && totalItems === 0 && !searchError;

  let itemCursor = 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Quick command"
      eyebrow="Workspace navigation"
      size="md"
      bodyClassName="p-0"
      footer={
        <div className="flex w-full items-center justify-between text-[12px] text-ink-3">
          <span>Use Up and Down arrows to move, Enter to open</span>
          <span className="font-mono">Esc</span>
        </div>
      }
    >
      <div className="flex flex-col">
        <div className="border-b border-line px-5 sm:px-6 py-3.5 bg-white">
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute left-3.5 h-4 w-4 text-ink-3"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={handleQueryChange}
              onKeyDown={handleInputKeyDown}
              placeholder="Search clients, invoices, or jump to a page..."
              aria-label="Search clients, invoices, or routes"
              autoComplete="off"
              className="h-11 w-full rounded-[12px] border border-line bg-fog/60 pl-10 pr-10 text-[15px] text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-ink focus:bg-white"
            />
            {isSearching && (
              <Loader2
                className="pointer-events-none absolute right-3.5 h-4 w-4 animate-spin text-ink-3"
                aria-label="Searching"
              />
            )}
          </div>
        </div>

        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto px-3 sm:px-4 py-3 space-y-4"
        >
          {searchError && (
            <div className="rounded-[12px] border border-ember/30 bg-ember-tint px-3.5 py-2.5 text-[13px] text-ember-ink">
              {searchError}
            </div>
          )}

          {matchingRoutes.length > 0 && (
            <section aria-label="Page shortcuts">
              <div className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                Pages
              </div>
              <div className="space-y-0.5">
                {matchingRoutes.map((route) => {
                  const index = itemCursor++;
                  const isActive = index === clampedActiveIndex;
                  const Icon = SHORTCUT_ICONS[route.href] ?? ArrowUpRight;
                  return (
                    <Link
                      key={route.href}
                      href={route.href}
                      onClick={handleClose}
                      onMouseEnter={() => setActiveIndex(index)}
                      data-command-item="true"
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-[12px] px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink",
                        isActive ? "bg-fog text-ink" : "text-ink-2 hover:bg-fog/60 hover:text-ink"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-2">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-medium text-ink">
                            {route.label}
                          </span>
                          <span className="block truncate text-[12px] text-ink-3">
                            {route.description}
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-ink-3">
                        {route.href}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {results.clients.length > 0 && (
            <section aria-label="Matching clients">
              <div className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                Clients
              </div>
              <div className="space-y-0.5">
                {results.clients.map((client) => {
                  const index = itemCursor++;
                  const isActive = index === clampedActiveIndex;
                  return (
                    <Link
                      key={client.id}
                      href={`/clients/${client.id}`}
                      onClick={handleClose}
                      onMouseEnter={() => setActiveIndex(index)}
                      data-command-item="true"
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-[12px] px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink",
                        isActive ? "bg-fog text-ink" : "text-ink-2 hover:bg-fog/60 hover:text-ink"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-2">
                          <Users className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-medium text-ink">
                            {client.clientName}
                          </span>
                          <span className="block truncate text-[12px] text-ink-3">
                            {client.email}
                          </span>
                        </span>
                      </span>
                      <Badge variant={getClientBadgeVariant(client.riskStatus)} />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {results.invoices.length > 0 && (
            <section aria-label="Matching invoices">
              <div className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                Invoices
              </div>
              <div className="space-y-0.5">
                {results.invoices.map((invoice) => {
                  const index = itemCursor++;
                  const isActive = index === clampedActiveIndex;
                  return (
                    <Link
                      key={invoice.id}
                      href={`/invoices/${invoice.id}`}
                      onClick={handleClose}
                      onMouseEnter={() => setActiveIndex(index)}
                      data-command-item="true"
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-[12px] px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink",
                        isActive ? "bg-fog text-ink" : "text-ink-2 hover:bg-fog/60 hover:text-ink"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-2">
                          <FileText className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-medium text-ink">
                            {invoice.invoiceNumber}
                          </span>
                          <span className="block truncate text-[12px] text-ink-3">
                            {invoice.clientName}
                          </span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2.5">
                        <span className="num text-[13px] font-medium text-ink">
                          {invoice.formattedTotal}
                        </span>
                        <Badge variant={getInvoiceBadgeVariant(invoice.status)} />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {hasNoResults && (
            <div className="py-8 text-center">
              <p className="text-[14px] font-medium text-ink">
                No matching pages, clients, or invoices
              </p>
              <p className="mt-1 text-[13px] text-ink-3">
                Try another invoice number, client name, or page keyword.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
