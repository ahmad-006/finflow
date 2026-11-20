"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { CalendarDay, CalendarEvent } from "@/modules/calendar/types";

interface CalendarAgendaListProps {
  days: CalendarDay[];
  baseCurrency: string;
  filterType?: "ALL" | "INFLOWS" | "OUTFLOWS" | "OVERDUE";
  onSelectDay: (day: CalendarDay) => void;
}

export function CalendarAgendaList({
  days,
  baseCurrency,
  filterType = "ALL",
  onSelectDay,
}: CalendarAgendaListProps) {
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

  // Filter for days that belong to current month and have matching events
  const activeDays = days
    .map((d) => ({
      ...d,
      matchingEvents: filterEvents(d.events),
    }))
    .filter((d) => d.isCurrentMonth && d.matchingEvents.length > 0);

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

  if (activeDays.length === 0) {
    return (
      <div className="p-12 text-center border border-line rounded bg-white space-y-3">
        <p className="text-sm font-medium text-ink">
          No matching transactions found
        </p>
        <p className="text-xs text-ink-3 max-w-sm mx-auto">
          There are no scheduled transactions matching the selected filter in this monthly period.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeDays.map((day) => {
        const parsedDate = new Date(`${day.date}T00:00:00Z`);
        const formattedDate = new Intl.DateTimeFormat("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(parsedDate);

        return (
          <div
            key={day.date}
            className="border border-line rounded bg-white overflow-hidden shadow-none"
          >
            {/* Day Header Bar */}
            <div className="p-3.5 border-b border-line bg-fog/30 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-ink">
                  {formattedDate}
                </span>
                {day.isToday && (
                  <span className="bg-ink text-white px-1.5 py-0.5 rounded text-[10px] font-sans font-medium">
                    Today
                  </span>
                )}
                <span className="text-xs font-mono text-ink-3">
                  ({day.matchingEvents.length}{" "}
                  {day.matchingEvents.length === 1 ? "event" : "events"})
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-moss">
                    +{formatMoney(day.inflows, baseCurrency)}
                  </span>
                  <span className="text-ink">
                    -{formatMoney(day.outflows, baseCurrency)}
                  </span>
                  <span
                    className={`font-medium ${
                      day.netChange > 0
                        ? "text-moss"
                        : day.netChange < 0
                        ? "text-ember-ink"
                        : "text-ink-3"
                    }`}
                  >
                    Net: {day.netChange > 0 ? "+" : ""}
                    {formatMoney(day.netChange, baseCurrency)}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="compact"
                  onClick={() => onSelectDay(day)}
                  className="text-xs h-7 px-2.5"
                >
                  Inspect day
                </Button>
              </div>
            </div>

            {/* Event Rows */}
            <div className="divide-y divide-line">
              {day.matchingEvents.map((event) => {
                const isInflow = event.type === "invoice";

                return (
                  <div
                    key={event.id}
                    className="p-3.5 flex items-center justify-between gap-4 hover:bg-fog/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-1.5 rounded-full ${
                          isInflow
                            ? "bg-moss-tint/40 text-moss"
                            : "bg-fog text-ink-3"
                        }`}
                      >
                        {isInflow ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          {isInflow ? (
                            <Link
                              href={`/invoices/${event.id}`}
                              className="font-mono text-xs font-medium text-ink hover:underline flex items-center gap-1"
                            >
                              <span>{event.referenceNumber}</span>
                              <ExternalLink className="w-3 h-3 text-ink-3" />
                            </Link>
                          ) : (
                            <span className="font-medium text-xs text-ink truncate">
                              {event.title}
                            </span>
                          )}

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

                        <p className="text-xs text-ink-2 truncate">
                          {isInflow
                            ? `Client: ${event.clientName}`
                            : `Category: ${event.category || "OPERATIONAL"}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`font-mono text-sm font-medium ${
                          isInflow ? "text-moss" : "text-ink"
                        }`}
                      >
                        {isInflow ? "+" : "-"}
                        {formatMoney(event.baseAmount, baseCurrency)}
                      </p>
                      {isInflow && event.currency !== baseCurrency && (
                        <p className="text-[11px] text-ink-3 font-mono">
                          {formatMoney(event.amount, event.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
