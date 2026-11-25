"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, ArrowUpRight, ArrowDownLeft, Calendar as CalendarIcon, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { lockBodyScroll, unlockBodyScroll, ModalBackdrop } from "@/components/ui/Modal";
import { formatMoney } from "@/lib/format";
import type { CalendarDay } from "@/modules/calendar/types";

interface CalendarDayInspectorProps {
  day: CalendarDay | null;
  baseCurrency: string;
  onClose: () => void;
}

const emptySubscribe = () => () => {};

export function CalendarDayInspector({
  day,
  baseCurrency,
  onClose,
}: CalendarDayInspectorProps) {
  const isClient = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  React.useEffect(() => {
    if (!day) return;

    lockBodyScroll();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [day, onClose]);

  if (!day || !isClient) return null;

  const invoices = day.events.filter((e) => e.type === "invoice");
  const expenses = day.events.filter((e) => e.type === "expense");

  const parsedDate = new Date(`${day.date}T00:00:00Z`);
  const fullDateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsedDate);

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

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Day Details Drawer"
    >
      <ModalBackdrop
        className="cursor-pointer"
        onClick={onClose}
        aria-label="Close drawer overlay"
      />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10 z-10">
        <aside className="w-screen max-w-[560px] bg-white border-l border-line flex flex-col justify-between overflow-y-auto">
          <div className="p-6 border-b border-line flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-ink-3 text-xs uppercase tracking-wider font-mono">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{day.dayOfWeek} · {day.date}</span>
                {day.isToday && (
                  <span className="bg-ink text-white px-1.5 py-0.5 rounded-[10px] text-[10px] font-sans font-medium">
                    Today
                  </span>
                )}
              </div>
              <h2 className="text-xl font-sans font-semibold tracking-tight text-ink">
                {fullDateLabel}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-3 hover:text-ink hover:bg-fog rounded-full transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 flex-1">
            <div className="grid grid-cols-3 gap-3 p-4 bg-fog/50 border border-line rounded-[10px]">
              <div>
                <p className="text-xs text-ink-3 mb-1">Inflows</p>
                <p className="font-mono text-sm font-medium text-moss">
                  +{formatMoney(day.inflows, baseCurrency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-3 mb-1">Outflows</p>
                <p className="font-mono text-sm font-medium text-ink">
                  -{formatMoney(day.outflows, baseCurrency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-3 mb-1">Net delta</p>
                <p
                  className={`font-mono text-sm font-medium ${
                    day.netChange < 0 ? "text-ember-ink" : "text-ink"
                  }`}
                >
                  {day.netChange > 0 ? "+" : ""}
                  {formatMoney(day.netChange, baseCurrency)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white border border-line rounded-[10px]">
              <span className="text-xs text-ink-2">
                Need treasury runway projection for this date?
              </span>
              <Link
                href={`/cash-flow/${day.date}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-ink hover:underline min-h-[44px] py-1"
              >
                <span>Open day details</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-ink flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-moss" />
                  <span>Maturing receivables ({invoices.length})</span>
                </h3>
              </div>

              {invoices.length === 0 ? (
                <p className="text-xs text-ink-3 py-4 text-center border border-dashed border-line rounded-[10px]">
                  No invoices scheduled for collection on this day.
                </p>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3 border border-line rounded-[10px] bg-white hover:border-line-strong transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="font-mono text-xs font-medium text-ink hover:underline"
                          >
                            {inv.referenceNumber}
                          </Link>
                          <Badge variant={mapInvoiceBadgeVariant(inv.status)}>
                            {inv.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-ink-2 truncate">
                          {inv.title}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-medium text-moss">
                          +{formatMoney(inv.baseAmount, baseCurrency)}
                        </p>
                        {inv.currency !== baseCurrency && (
                          <p className="text-[11px] text-ink-3 font-mono">
                            {formatMoney(inv.amount, inv.currency)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-ink flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-ink-3" />
                  <span>Maturing payables ({expenses.length})</span>
                </h3>
              </div>

              {expenses.length === 0 ? (
                <p className="text-xs text-ink-3 py-4 text-center border border-dashed border-line rounded-[10px]">
                  No operational expenses due on this day.
                </p>
              ) : (
                <div className="space-y-2">
                  {expenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-3 border border-line rounded-[10px] bg-white hover:border-line-strong transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-xs text-ink truncate">
                            {exp.title}
                          </p>
                          <Badge variant={mapExpenseBadgeVariant(exp.status)}>
                            {exp.status}
                          </Badge>
                        </div>
                        {exp.category && (
                          <p className="text-[11px] text-ink-3 uppercase font-mono">
                            {exp.category}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-medium text-ink">
                          -{formatMoney(exp.baseAmount, baseCurrency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="p-4 border-t border-line bg-fog/30 flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={onClose} className="min-h-[44px] px-6 text-xs font-medium">
              Close
            </Button>
          </div>
        </aside>
      </div>
    </div>,
    document.body
  );
}
