"use client";

import * as React from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import type { CalendarDay, CalendarEvent } from "@/modules/calendar/types";

interface CalendarWeekGridProps {
  days: CalendarDay[];
  baseCurrency: string;
  filterType?: "ALL" | "INFLOWS" | "OUTFLOWS" | "OVERDUE";
  onSelectDay: (day: CalendarDay) => void;
}

export function CalendarWeekGrid({
  days,
  baseCurrency,
  filterType = "ALL",
  onSelectDay,
}: CalendarWeekGridProps) {
  // Find current week or default to first 7 days
  const todayIndex = days.findIndex((d) => d.isToday);
  const weekStart = todayIndex !== -1 ? Math.floor(todayIndex / 7) * 7 : 0;
  const currentWeekDays = days.slice(weekStart, weekStart + 7);

  function filterEvents(events: CalendarEvent[]) {
    if (filterType === "INFLOWS") {
      return events.filter((e) => e.type === "invoice");
    }
    if (filterType === "OUTFLOWS") {
      return events.filter((e) => e.type === "expense");
    }
    if (filterType === "OVERDUE") {
      return events.filter((e) => e.isOverdue);
    }
    return events;
  }

  function mapInvoiceBadgeVariant(status: string) {
    switch (status) {
      case "PAID":
        return "paid";
      case "OVERDUE":
        return "overdue";
      case "DRAFT":
        return "draft";
      case "CANCELLED":
        return "cancelled";
      default:
        return "sent";
    }
  }

  function mapExpenseBadgeVariant(status: string) {
    switch (status) {
      case "PAID":
        return "paid";
      case "OVERDUE":
        return "overdue";
      default:
        return "draft";
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 border border-line divide-y md:divide-y-0 md:divide-x divide-line bg-white rounded overflow-hidden select-none">
      {currentWeekDays.map((day, colIdx) => {
        const matchingEvents = filterEvents(day.events);
        const hasEvents = matchingEvents.length > 0;
        const isWeekend = colIdx === 5 || colIdx === 6;

        return (
          <div
            key={day.date}
            onClick={() => onSelectDay(day)}
            className={`flex flex-col min-h-[380px] p-3 transition-colors cursor-pointer hover:bg-fog/30 ${
              day.isToday
                ? "bg-fog/10 ring-2 ring-inset ring-ink"
                : isWeekend
                ? "bg-fog/10"
                : "bg-white"
            }`}
          >
            {/* Day Header */}
            <div className="pb-3 border-b border-line mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-ink-3 uppercase">
                  {day.dayOfWeek}
                </span>
                <span
                  className={`text-xs font-mono font-medium ${
                    day.isToday
                      ? "bg-ink text-white px-1.5 py-0.5 rounded text-[11px]"
                      : "text-ink"
                  }`}
                >
                  {day.dayNumber}
                </span>
              </div>

              {/* Net Daily Delta */}
              <div className="mt-2 text-right">
                <p className="text-[10px] text-ink-3">Daily net</p>
                <p
                  className={`text-xs font-mono font-medium ${
                    day.netChange > 0
                      ? "text-moss"
                      : day.netChange < 0
                      ? "text-ember-ink"
                      : "text-ink-3"
                  }`}
                >
                  {day.netChange > 0 ? "+" : ""}
                  {formatMoney(day.netChange, baseCurrency, {
                    compactHero: true,
                  })}
                </p>
              </div>
            </div>

            {/* Events Stack */}
            <div className="space-y-2 flex-1 overflow-y-auto">
              {!hasEvents ? (
                <div className="h-full flex flex-col items-center justify-center p-4 border border-dashed border-line/60 rounded text-center">
                  <p className="text-[11px] text-ink-3 font-mono">
                    No transactions
                  </p>
                  <p className="text-[10px] text-ink-3/60 mt-1">Click to inspect</p>
                </div>
              ) : (
                matchingEvents.map((event) => {
                  const isInflow = event.type === "invoice";
                  return (
                    <div
                      key={event.id}
                      className="p-2.5 border border-line rounded bg-white hover:border-line-strong transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-mono text-ink-3 truncate">
                          {event.referenceNumber}
                        </span>
                        <Badge
                          variant={
                            isInflow
                              ? mapInvoiceBadgeVariant(event.status)
                              : mapExpenseBadgeVariant(event.status)
                          }
                        >
                          {event.status}
                        </Badge>
                      </div>

                      <p className="text-xs font-medium text-ink truncate">
                        {event.title}
                      </p>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-line/60">
                        <span className="text-ink-3 flex items-center gap-1">
                          {isInflow ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-moss" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-ink-3" />
                          )}
                          <span>{isInflow ? "In" : "Out"}</span>
                        </span>
                        <span
                          className={`font-mono font-medium ${
                            isInflow ? "text-moss" : "text-ink"
                          }`}
                        >
                          {isInflow ? "+" : "-"}
                          {formatMoney(event.baseAmount, baseCurrency, {
                            compactHero: true,
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
