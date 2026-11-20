"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Layers,
  List,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { getCalendarMonthAction } from "@/modules/calendar/actions";
import type {
  CalendarMonthData,
  CalendarDay,
  CalendarViewMode,
} from "@/modules/calendar/types";
import { CalendarMonthGrid } from "./CalendarMonthGrid";
import { CalendarWeekGrid } from "./CalendarWeekGrid";
import { CalendarAgendaList } from "./CalendarAgendaList";
import { CalendarDayInspector } from "./CalendarDayInspector";

interface CalendarCockpitViewProps {
  initialData: CalendarMonthData;
}

type StreamFilterType = "ALL" | "INFLOWS" | "OUTFLOWS" | "OVERDUE";

export function CalendarCockpitView({ initialData }: CalendarCockpitViewProps) {
  const [data, setData] = React.useState<CalendarMonthData>(initialData);
  const [viewMode, setViewMode] = React.useState<CalendarViewMode>("month");
  const [filterType, setFilterType] = React.useState<StreamFilterType>("ALL");
  const [selectedDay, setSelectedDay] = React.useState<CalendarDay | null>(null);
  const [isNavigating, setIsNavigating] = React.useState<boolean>(false);

  const { summary, days, baseCurrency } = data;

  async function handleNavigate(direction: "prev" | "next" | "today") {
    let nextYear = summary.year;
    let nextMonth = summary.month;

    if (direction === "today") {
      const now = new Date();
      nextYear = now.getUTCFullYear();
      nextMonth = now.getUTCMonth() + 1;
    } else if (direction === "prev") {
      if (summary.month === 1) {
        nextYear = summary.year - 1;
        nextMonth = 12;
      } else {
        nextMonth = summary.month - 1;
      }
    } else {
      if (summary.month === 12) {
        nextYear = summary.year + 1;
        nextMonth = 1;
      } else {
        nextMonth = summary.month + 1;
      }
    }

    setIsNavigating(true);
    try {
      const res = await getCalendarMonthAction({
        year: nextYear,
        month: nextMonth,
        view: viewMode,
      });

      if (res.success && res.data) {
        setData(res.data);
      }
    } finally {
      setIsNavigating(false);
    }
  }

  // Dynamic sentence banner
  const bannerText = React.useMemo(() => {
    let base = `${summary.invoiceCount} ${
      summary.invoiceCount === 1 ? "receivable" : "receivables"
    } and ${summary.expenseCount} ${
      summary.expenseCount === 1 ? "payable" : "payables"
    } scheduled in ${summary.monthName} ${summary.year}.`;

    if (summary.overdueCount > 0) {
      base += ` ${summary.overdueCount} overdue ${
        summary.overdueCount === 1 ? "item requires" : "items require"
      } immediate collection or settlement.`;
    }

    return base;
  }, [summary]);

  // Compute category cash flow aggregates for the sidebar
  const categoryStats = React.useMemo(() => {
    const map = new Map<string, { label: string; amount: number; count: number; type: "inflow" | "outflow" }>();

    for (const d of days) {
      if (!d.isCurrentMonth) continue;
      for (const ev of d.events) {
        const key = ev.type === "invoice" ? "INVOICES" : (ev.category || "OPERATIONAL");
        const existing = map.get(key) || {
          label: ev.type === "invoice" ? "Customer Invoices" : (ev.category || "Operational"),
          amount: 0,
          count: 0,
          type: ev.type === "invoice" ? "inflow" : "outflow",
        };
        existing.amount += ev.baseAmount;
        existing.count += 1;
        map.set(key, existing);
      }
    }

    return Array.from(map.entries())
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => b.amount - a.amount);
  }, [days]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header and Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-normal tracking-tight text-ink">
              {summary.monthName} {summary.year}
            </h1>
            {isNavigating && (
              <span className="text-xs text-ink-3 font-mono animate-pulse">
                Updating...
              </span>
            )}
          </div>
          <p className="text-xs text-ink-3 max-w-2xl">{bannerText}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Navigation */}
          <div className="flex items-center border border-line rounded-full bg-white p-0.5">
            <button
              onClick={() => handleNavigate("prev")}
              disabled={isNavigating}
              className="w-11 h-11 flex items-center justify-center text-ink-2 hover:text-ink hover:bg-fog rounded-full transition-colors disabled:opacity-40"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleNavigate("today")}
              disabled={isNavigating}
              className="h-11 px-4 flex items-center justify-center text-xs font-medium text-ink hover:bg-fog rounded-full transition-colors disabled:opacity-40"
            >
              Today
            </button>
            <button
              onClick={() => handleNavigate("next")}
              disabled={isNavigating}
              className="w-11 h-11 flex items-center justify-center text-ink-2 hover:text-ink hover:bg-fog rounded-full transition-colors disabled:opacity-40"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Switcher: Month / Week / List */}
          <div className="flex items-center border border-line rounded-full bg-white p-0.5 text-xs font-medium">
            <button
              onClick={() => setViewMode("month")}
              className={`flex items-center gap-1.5 h-11 px-4 rounded-full transition-colors ${
                viewMode === "month"
                  ? "bg-ink text-white font-medium shadow-none"
                  : "text-ink-2 hover:text-ink hover:bg-fog"
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Month</span>
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`flex items-center gap-1.5 h-11 px-4 rounded-full transition-colors ${
                viewMode === "week"
                  ? "bg-ink text-white font-medium shadow-none"
                  : "text-ink-2 hover:text-ink hover:bg-fog"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Week</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 h-11 px-4 rounded-full transition-colors ${
                viewMode === "list"
                  ? "bg-ink text-white font-medium shadow-none"
                  : "text-ink-2 hover:text-ink hover:bg-fog"
              }`}
            >
              <List className="w-4 h-4" />
              <span>Agenda</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Quick Actions & Stream Filters */}
      <div className="lg:hidden space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/invoices/new"
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-full bg-ink text-white text-xs font-medium hover:bg-ink-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New invoice</span>
          </Link>
          <Link
            href="/expenses"
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-full bg-fog text-ink text-xs font-medium hover:bg-fog-2 transition-colors border border-line"
          >
            <Plus className="w-4 h-4" />
            <span>Add bill</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterType("ALL")}
            className={`min-h-[44px] px-3.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              filterType === "ALL"
                ? "bg-ink text-white border-ink"
                : "bg-white text-ink border-line hover:bg-fog"
            }`}
          >
            <span>All</span>
            <span className="font-mono text-[11px] opacity-80">
              {summary.invoiceCount + summary.expenseCount}
            </span>
          </button>

          <button
            onClick={() => setFilterType("INFLOWS")}
            className={`min-h-[44px] px-3.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              filterType === "INFLOWS"
                ? "bg-ink text-white border-ink"
                : "bg-white text-ink border-line hover:bg-fog"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-moss shrink-0" />
            <span>Receivables</span>
            <span className="font-mono text-[11px] opacity-80">
              {summary.invoiceCount}
            </span>
          </button>

          <button
            onClick={() => setFilterType("OUTFLOWS")}
            className={`min-h-[44px] px-3.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              filterType === "OUTFLOWS"
                ? "bg-ink text-white border-ink"
                : "bg-white text-ink border-line hover:bg-fog"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-ink-3 shrink-0" />
            <span>Payables</span>
            <span className="font-mono text-[11px] opacity-80">
              {summary.expenseCount}
            </span>
          </button>

          <button
            onClick={() => setFilterType("OVERDUE")}
            className={`min-h-[44px] px-3.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              filterType === "OVERDUE"
                ? "bg-ember-ink text-white border-ember-ink"
                : "bg-white text-ember-ink border-line hover:bg-ember-tint/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-ember-ink shrink-0" />
            <span>Overdue</span>
            <span className="font-mono text-[11px] font-bold">
              {summary.overdueCount}
            </span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
        {/* Left Interactive Sidebar */}
        <aside className="space-y-6 hidden lg:block">
          {/* Quick Transaction Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/invoices/new"
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-full bg-ink text-white text-xs font-medium hover:bg-ink-hover transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New invoice</span>
            </Link>
            <Link
              href="/expenses"
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-full bg-fog text-ink text-xs font-medium hover:bg-fog-2 transition-colors border border-line"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add bill</span>
            </Link>
          </div>

          {/* Stream Filter Pills */}
          <div className="p-4 border border-line rounded bg-white space-y-3">
            <p className="text-xs font-mono font-medium text-ink-3 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3 h-3" />
              <span>Stream filter</span>
            </p>
            <div className="space-y-1">
              <button
                onClick={() => setFilterType("ALL")}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded text-xs transition-colors ${
                  filterType === "ALL"
                    ? "bg-ink text-white font-medium"
                    : "text-ink hover:bg-fog text-left"
                }`}
              >
                <span>All transactions</span>
                <span className="font-mono text-[11px] opacity-80">
                  {summary.invoiceCount + summary.expenseCount}
                </span>
              </button>

              <button
                onClick={() => setFilterType("INFLOWS")}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded text-xs transition-colors ${
                  filterType === "INFLOWS"
                    ? "bg-ink text-white font-medium"
                    : "text-ink hover:bg-fog text-left"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-moss" />
                  <span>Receivables (In)</span>
                </span>
                <span className="font-mono text-[11px] opacity-80">
                  {summary.invoiceCount}
                </span>
              </button>

              <button
                onClick={() => setFilterType("OUTFLOWS")}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded text-xs transition-colors ${
                  filterType === "OUTFLOWS"
                    ? "bg-ink text-white font-medium"
                    : "text-ink hover:bg-fog text-left"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-3" />
                  <span>Payables (Out)</span>
                </span>
                <span className="font-mono text-[11px] opacity-80">
                  {summary.expenseCount}
                </span>
              </button>

              <button
                onClick={() => setFilterType("OVERDUE")}
                className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded text-xs transition-colors ${
                  filterType === "OVERDUE"
                    ? "bg-ember-ink text-white font-medium"
                    : "text-ember-ink hover:bg-ember-tint/50 text-left"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-ember-ink" />
                  <span>Overdue items</span>
                </span>
                <span className="font-mono text-[11px] font-bold">
                  {summary.overdueCount}
                </span>
              </button>
            </div>
          </div>

          {/* Category Cash Flow Distribution */}
          <div className="p-4 border border-line rounded bg-white space-y-3">
            <p className="text-xs font-mono font-medium text-ink-3 uppercase tracking-wider">
              Category allocation
            </p>
            <div className="space-y-2">
              {categoryStats.map((cat) => (
                <div
                  key={cat.key}
                  className="flex items-center justify-between text-xs py-0.5"
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate font-medium text-ink">{cat.label}</p>
                    <p className="text-[10px] text-ink-3 font-mono">
                      {cat.count} {cat.count === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <span
                    className={`font-mono text-xs shrink-0 ${
                      cat.type === "inflow" ? "text-moss font-medium" : "text-ink"
                    }`}
                  >
                    {cat.type === "inflow" ? "+" : "-"}
                    {formatMoney(cat.amount, baseCurrency, {
                      compactHero: true,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Forward Treasury Runway Box */}
          <div className="p-4 border border-line rounded bg-fog/30 space-y-3">
            <p className="text-xs font-mono font-medium text-ink-3 uppercase tracking-wider">
              Runway projection
            </p>
            <div className="space-y-1">
              <p className="text-xs text-ink-2">
                Monthly Net Cash Impact
              </p>
              <p
                className={`font-mono text-base font-medium ${
                  summary.netChange < 0 ? "text-ember-ink" : "text-moss"
                }`}
              >
                {summary.netChange > 0 ? "+" : ""}
                {formatMoney(summary.netChange, baseCurrency)}
              </p>
            </div>
            <Link
              href="/cash-flow"
              className="inline-flex items-center gap-1 text-xs font-medium text-ink hover:underline pt-1"
            >
              <span>Open 30-day runway</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </aside>

        {/* Right Main Workstation Canvas */}
        <div className="space-y-6 min-w-0">
          {/* Monthly Financial KPI Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-fog/30 border border-line rounded">
            <div>
              <p className="text-xs text-ink-3 mb-1">Expected inflows</p>
              <p className="font-mono text-lg font-medium text-moss">
                +{formatMoney(summary.totalInflows, baseCurrency)}
              </p>
              <p className="text-[11px] text-ink-3 font-mono mt-0.5">
                {summary.invoiceCount} scheduled {summary.invoiceCount === 1 ? "invoice" : "invoices"}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-3 mb-1">Scheduled outflows</p>
              <p className="font-mono text-lg font-medium text-ink">
                -{formatMoney(summary.totalOutflows, baseCurrency)}
              </p>
              <p className="text-[11px] text-ink-3 font-mono mt-0.5">
                {summary.expenseCount} scheduled {summary.expenseCount === 1 ? "payable" : "payables"}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-3 mb-1">Monthly net delta</p>
              <p
                className={`font-mono text-lg font-medium ${
                  summary.netChange < 0 ? "text-ember-ink" : "text-ink"
                }`}
              >
                {summary.netChange > 0 ? "+" : ""}
                {formatMoney(summary.netChange, baseCurrency)}
              </p>
              <p className="text-[11px] text-ink-3 font-mono mt-0.5">
                {summary.netChange >= 0 ? "Net positive" : "Net burn trajectory"}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-3 mb-1">Action items</p>
              <div className="flex items-center gap-1.5 pt-0.5">
                {summary.overdueCount > 0 ? (
                  <button
                    onClick={() => setFilterType("OVERDUE")}
                    className="min-h-[44px] flex items-center gap-1.5 text-xs font-medium text-ember-ink bg-ember-tint px-3 py-2 rounded hover:bg-ember-tint/80 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>{summary.overdueCount} overdue</span>
                  </button>
                ) : (
                  <span className="min-h-[44px] flex items-center text-xs font-medium text-moss bg-moss-tint px-3 py-2 rounded">
                    All schedules current
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Active Filter Pill Bar if filtered */}
          {filterType !== "ALL" && (
            <div className="flex items-center justify-between p-2.5 bg-fog/60 border border-line rounded text-xs">
              <span className="text-ink-2">
                Filtering by:{" "}
                <strong className="text-ink font-medium uppercase">
                  {filterType === "INFLOWS"
                    ? "Receivables Only"
                    : filterType === "OUTFLOWS"
                    ? "Payables Only"
                    : "Overdue Only"}
                </strong>
              </span>
              <button
                onClick={() => setFilterType("ALL")}
                className="text-xs text-ink underline font-medium hover:text-ink-hover"
              >
                Reset filter
              </button>
            </div>
          )}

          {/* Active View: Month / Week / List */}
          <div>
            {viewMode === "month" && (
              <CalendarMonthGrid
                days={days}
                baseCurrency={baseCurrency}
                filterType={filterType}
                onSelectDay={(day) => setSelectedDay(day)}
              />
            )}
            {viewMode === "week" && (
              <CalendarWeekGrid
                days={days}
                baseCurrency={baseCurrency}
                filterType={filterType}
                onSelectDay={(day) => setSelectedDay(day)}
              />
            )}
            {viewMode === "list" && (
              <CalendarAgendaList
                days={days}
                baseCurrency={baseCurrency}
                filterType={filterType}
                onSelectDay={(day) => setSelectedDay(day)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Slide-Over Day Inspector Drawer */}
      {selectedDay && (
        <CalendarDayInspector
          day={selectedDay}
          baseCurrency={baseCurrency}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}
