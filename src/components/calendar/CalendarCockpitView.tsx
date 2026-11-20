"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Layers,
  List,
  AlertTriangle,
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

export function CalendarCockpitView({ initialData }: CalendarCockpitViewProps) {
  const [data, setData] = React.useState<CalendarMonthData>(initialData);
  const [viewMode, setViewMode] = React.useState<CalendarViewMode>("month");
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
              className="p-1.5 text-ink-2 hover:text-ink hover:bg-fog rounded-full transition-colors disabled:opacity-40"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleNavigate("today")}
              disabled={isNavigating}
              className="px-3 py-1 text-xs font-medium text-ink hover:bg-fog rounded-full transition-colors disabled:opacity-40"
            >
              Today
            </button>
            <button
              onClick={() => handleNavigate("next")}
              disabled={isNavigating}
              className="p-1.5 text-ink-2 hover:text-ink hover:bg-fog rounded-full transition-colors disabled:opacity-40"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Switcher: Month / Week / List */}
          <div className="flex items-center border border-line rounded-full bg-white p-0.5 text-xs font-medium">
            <button
              onClick={() => setViewMode("month")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${
                viewMode === "month"
                  ? "bg-ink text-white font-medium"
                  : "text-ink-2 hover:text-ink hover:bg-fog"
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Month</span>
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${
                viewMode === "week"
                  ? "bg-ink text-white font-medium"
                  : "text-ink-2 hover:text-ink hover:bg-fog"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Week</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${
                viewMode === "list"
                  ? "bg-ink text-white font-medium"
                  : "text-ink-2 hover:text-ink hover:bg-fog"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Agenda</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Financial KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-fog/30 border border-line rounded">
        <div>
          <p className="text-xs text-ink-3 mb-1">Expected inflows</p>
          <p className="font-mono text-lg font-medium text-moss">
            +{formatMoney(summary.totalInflows, baseCurrency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-3 mb-1">Scheduled outflows</p>
          <p className="font-mono text-lg font-medium text-ink">
            -{formatMoney(summary.totalOutflows, baseCurrency)}
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
        </div>
        <div>
          <p className="text-xs text-ink-3 mb-1">Attention required</p>
          <div className="flex items-center gap-1.5 pt-0.5">
            {summary.overdueCount > 0 ? (
              <span className="flex items-center gap-1 text-xs font-medium text-ember-ink bg-ember-tint px-2 py-0.5 rounded">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{summary.overdueCount} overdue</span>
              </span>
            ) : (
              <span className="text-xs font-medium text-moss bg-moss-tint px-2 py-0.5 rounded">
                All schedules current
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main View Grid Area */}
      <div>
        {viewMode === "month" && (
          <CalendarMonthGrid
            days={days}
            baseCurrency={baseCurrency}
            onSelectDay={(day) => setSelectedDay(day)}
          />
        )}
        {viewMode === "week" && (
          <CalendarWeekGrid
            days={days}
            baseCurrency={baseCurrency}
            onSelectDay={(day) => setSelectedDay(day)}
          />
        )}
        {viewMode === "list" && (
          <CalendarAgendaList
            days={days}
            baseCurrency={baseCurrency}
            onSelectDay={(day) => setSelectedDay(day)}
          />
        )}
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
