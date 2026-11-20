"use client";

import * as React from "react";
import { formatMoney } from "@/lib/format";
import type { CalendarDay, CalendarEvent } from "@/modules/calendar/types";

interface CalendarMonthGridProps {
  days: CalendarDay[];
  baseCurrency: string;
  filterType?: "ALL" | "INFLOWS" | "OUTFLOWS" | "OVERDUE";
  onSelectDay: (day: CalendarDay) => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarMonthGrid({
  days,
  baseCurrency,
  filterType = "ALL",
  onSelectDay,
}: CalendarMonthGridProps) {
  // Split the flat array of 35 or 42 days into weeks of 7
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

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

  function renderEventPill(event: CalendarEvent) {
    const isInflow = event.type === "invoice";
    return (
      <div
        key={event.id}
        className={`px-1 py-0.5 sm:px-1.5 sm:py-1 rounded text-[10px] sm:text-[11px] flex items-center justify-between gap-1 border transition-colors min-w-0 overflow-hidden ${
          isInflow
            ? "bg-moss-tint/40 border-moss/20 text-moss hover:bg-moss-tint"
            : event.isOverdue
            ? "bg-ember-tint/40 border-ember/20 text-ember-ink hover:bg-ember-tint"
            : "bg-fog border-line text-ink hover:bg-fog-2"
        }`}
        title={`${event.title} - ${formatMoney(event.baseAmount, baseCurrency)} (${event.status})`}
      >
        <span className="truncate flex items-center gap-1 min-w-0">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isInflow ? "bg-moss" : event.isOverdue ? "bg-ember-ink" : "bg-ink-3"
            }`}
          />
          <span className="truncate font-medium">{event.title}</span>
        </span>
        <span className="hidden sm:inline font-mono font-medium shrink-0">
          {isInflow ? "+" : "-"}
          {formatMoney(event.baseAmount, baseCurrency, { compactHero: true })}
        </span>
      </div>
    );
  }

  return (
    <div className="border border-line bg-white rounded overflow-x-clip select-none min-w-0">
      {/* 7-Column Weekday Header */}
      <div className="grid grid-cols-7 border-b border-line bg-fog/40 divide-x divide-line text-center text-xs font-mono font-medium text-ink-3 py-2 sm:py-2.5">
        {WEEKDAYS.map((w, idx) => (
          <div
            key={w}
            className={`truncate px-0.5 ${idx === 5 || idx === 6 ? "text-ink-2 font-semibold" : ""}`}
          >
            <span className="sm:hidden">{w[0]}</span>
            <span className="hidden sm:inline">{w}</span>
          </div>
        ))}
      </div>

      {/* Grid Matrix */}
      <div className="divide-y divide-line">
        {weeks.map((week, weekIdx) => (
          <div
            key={weekIdx}
            className="grid grid-cols-7 divide-x divide-line min-h-[90px] sm:min-h-[125px]"
          >
            {week.map((day, colIdx) => {
              const matchingEvents = filterEvents(day.events);
              const hasEvents = matchingEvents.length > 0;
              const displayedEvents = matchingEvents.slice(0, 2);
              const remainingCount = matchingEvents.length - 2;
              const isWeekend = colIdx === 5 || colIdx === 6;

              return (
                <div
                  key={day.date}
                  onClick={() => onSelectDay(day)}
                  className={`p-1 sm:p-2 flex flex-col justify-between transition-colors cursor-pointer group relative min-w-0 overflow-hidden ${
                    !day.isCurrentMonth
                      ? "bg-fog/30 text-ink-3/70 hover:bg-fog/50"
                      : isWeekend
                      ? "bg-fog/15 hover:bg-fog/30 text-ink"
                      : "bg-white hover:bg-fog/30 text-ink"
                  } ${day.isToday ? "ring-2 ring-inset ring-ink bg-fog/10" : ""}`}
                >
                  {/* Top Bar: Date Number and Net Delta */}
                  <div className="flex items-center justify-between mb-1 min-w-0">
                    <span
                      className={`text-xs font-mono font-medium ${
                        day.isToday
                          ? "bg-ink text-white px-1.5 py-0.5 rounded text-[11px]"
                          : !day.isCurrentMonth
                          ? "text-ink-3/60"
                          : "text-ink"
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    {hasEvents ? (
                      <>
                        <span
                          className={`hidden sm:inline text-[10px] font-mono font-medium px-1 py-0.2 rounded truncate ${
                            day.netChange > 0
                              ? "text-moss bg-moss-tint/30"
                              : day.netChange < 0
                              ? "text-ember-ink bg-ember-tint/30"
                              : "text-ink-3 bg-fog"
                          }`}
                        >
                          {day.netChange > 0 ? "+" : ""}
                          {formatMoney(day.netChange, baseCurrency, {
                            compactHero: true,
                          })}
                        </span>
                        <span
                          className={`sm:hidden w-1.5 h-1.5 rounded-full shrink-0 ${
                            day.netChange > 0
                              ? "bg-moss"
                              : day.netChange < 0
                              ? "bg-ember-ink"
                              : "bg-ink-3"
                          }`}
                        />
                      </>
                    ) : (
                      <span className="text-[10px] text-ink-3/40 font-mono opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                        + Inspect
                      </span>
                    )}
                  </div>

                  {/* Middle: Event Pills */}
                  <div className="space-y-1 flex-1 min-w-0">
                    {displayedEvents.map(renderEventPill)}
                    {remainingCount > 0 && (
                      <p className="text-[9px] sm:text-[10px] font-mono text-ink-3 text-center hover:underline pt-0.5 truncate">
                        +{remainingCount} more
                      </p>
                    )}
                  </div>

                  {/* Empty state visual placeholder for active month */}
                  {!hasEvents && day.isCurrentMonth && (
                    <div className="h-4 hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-ink-3 font-mono">
                        No transactions
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
