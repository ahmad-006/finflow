"use client";

import * as React from "react";
import { formatMoney } from "@/lib/format";
import type { CalendarDay, CalendarEvent } from "@/modules/calendar/types";

interface CalendarMonthGridProps {
  days: CalendarDay[];
  baseCurrency: string;
  onSelectDay: (day: CalendarDay) => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarMonthGrid({
  days,
  baseCurrency,
  onSelectDay,
}: CalendarMonthGridProps) {
  // Split the flat array of 35 or 42 days into weeks of 7
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  function renderEventPill(event: CalendarEvent) {
    const isInflow = event.type === "invoice";
    return (
      <div
        key={event.id}
        className={`px-1.5 py-0.5 rounded text-[11px] truncate flex items-center justify-between gap-1 border ${
          isInflow
            ? "bg-moss-tint/40 border-moss/20 text-moss"
            : "bg-fog border-line text-ink"
        }`}
        title={`${event.title} - ${formatMoney(event.baseAmount, baseCurrency)} (${event.status})`}
      >
        <span className="truncate flex items-center gap-1">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isInflow ? "bg-moss" : "bg-ink-3"
            }`}
          />
          <span className="truncate">{event.title}</span>
        </span>
        <span className="font-mono font-medium shrink-0">
          {isInflow ? "+" : "-"}
          {formatMoney(event.baseAmount, baseCurrency, { compactHero: true })}
        </span>
      </div>
    );
  }

  return (
    <div className="border border-line bg-white rounded overflow-hidden select-none">
      {/* 7-Column Weekday Header */}
      <div className="grid grid-cols-7 border-b border-line bg-fog/40 divide-x divide-line text-center text-xs font-mono font-medium text-ink-3 py-2">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      {/* Grid Matrix */}
      <div className="divide-y divide-line">
        {weeks.map((week, weekIdx) => (
          <div
            key={weekIdx}
            className="grid grid-cols-7 divide-x divide-line min-h-[110px]"
          >
            {week.map((day) => {
              const hasEvents = day.events.length > 0;
              const displayedEvents = day.events.slice(0, 2);
              const remainingCount = day.events.length - 2;

              return (
                <div
                  key={day.date}
                  onClick={() => onSelectDay(day)}
                  className={`p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                    !day.isCurrentMonth
                      ? "bg-fog/20 text-ink-3 hover:bg-fog/50"
                      : "bg-white hover:bg-fog/30 text-ink"
                  } ${day.isToday ? "ring-1 ring-inset ring-ink" : ""}`}
                >
                  {/* Top Bar: Date Number and Net Delta */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-mono font-medium ${
                        day.isToday
                          ? "bg-ink text-white px-1.5 py-0.2 rounded"
                          : !day.isCurrentMonth
                          ? "text-ink-3"
                          : "text-ink"
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    {hasEvents && (
                      <span
                        className={`text-[10px] font-mono font-medium ${
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
                      </span>
                    )}
                  </div>

                  {/* Middle: Event Pills */}
                  <div className="space-y-1 flex-1">
                    {displayedEvents.map(renderEventPill)}
                    {remainingCount > 0 && (
                      <p className="text-[10px] font-mono text-ink-3 text-center hover:underline pt-0.5">
                        +{remainingCount} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
