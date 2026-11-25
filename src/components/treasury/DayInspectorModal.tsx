"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import type { DailyForecastPoint, ForecastMode } from "@/modules/treasury/types";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface DayInspectorModalProps {
  point: DailyForecastPoint | null;
  isOpen: boolean;
  onClose: () => void;
  mode: ForecastMode;
  baseCurrency: string;
  safetyBuffer: number;
}

/**
 * Compact modal for inspecting a single forecast day's cash balances and events
 * without navigating away from /cash-flow.
 */
export function DayInspectorModal({
  point,
  isOpen,
  onClose,
  mode,
  baseCurrency,
  safetyBuffer,
}: DayInspectorModalProps) {
  if (!isOpen || !point) {
    return null;
  }

  const isBufferWarning =
    !point.isBreach && point.closingBalance < safetyBuffer * 1.25;
  const isPositiveNet = point.netChange > 0;
  const isNegativeNet = point.netChange < 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      eyebrow={`Day ${point.dayIndex} · ${mode === "expected" ? "Expected mode" : "On-time mode"}`}
      title={`${point.dayOfWeek}, ${point.displayDate}`}
      description={
        point.dayIndex === 0
          ? "Today's opening liquidity and maturing items."
          : `Projected cash position for ${point.date}.`
      }
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="min-h-[44px] h-11 px-5 rounded-full text-sm font-medium"
          >
            Close
          </Button>
          <Link
            href={`/cash-flow/${point.date}?mode=${mode}`}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] h-11 px-5 rounded-full bg-ink text-white hover:bg-ink-hover text-sm font-medium transition-colors"
          >
            <span>Open full day ledger</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Deficit / buffer health summary */}
        <div
          className={cn(
            "flex items-center justify-between gap-3 p-3.5 rounded-[12px] border text-xs",
            point.isBreach
              ? "border-ember/30 bg-ember-tint/60"
              : isBufferWarning
              ? "border-amber/30 bg-amber-tint/50"
              : "border-line bg-fog/50"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="w-4 h-4 text-ink-3 shrink-0" />
            <span className="text-ink-2 truncate">
              {point.isBreach
                ? `Shortfall of ${formatMoney(point.deficitAmount, baseCurrency)} below ${formatMoney(safetyBuffer, baseCurrency)} buffer`
                : isBufferWarning
                ? `Within 25% of ${formatMoney(safetyBuffer, baseCurrency)} safety buffer`
                : `Above ${formatMoney(safetyBuffer, baseCurrency)} safety buffer`}
            </span>
          </div>
          {point.isBreach ? (
            <Badge variant="critical">
              Deficit: {formatMoney(point.deficitAmount, baseCurrency)}
            </Badge>
          ) : isBufferWarning ? (
            <Badge variant="watchlist">Buffer warning</Badge>
          ) : (
            <Badge variant="healthy">Healthy</Badge>
          )}
        </div>

        {/* Core 4 balances + net change */}
        <div className="grid grid-cols-2 gap-3 rounded-[12px] border border-line bg-fog/40 p-4 text-xs">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3 block">
              Opening balance
            </span>
            <span className="mt-1 block text-sm sm:text-base font-serif font-bold text-ink tabular-nums">
              {formatMoney(point.openingBalance, baseCurrency)}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3 block">
              Closing balance
            </span>
            <span
              className={cn(
                "mt-1 block text-sm sm:text-base font-serif font-bold tabular-nums",
                point.isBreach ? "text-ember-ink" : "text-ink"
              )}
            >
              {formatMoney(point.closingBalance, baseCurrency)}
            </span>
          </div>

          <div className="pt-2.5 border-t border-line/60">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3 block">
              Inflows
            </span>
            <span
              className={cn(
                "mt-1 block font-mono font-semibold tabular-nums",
                point.inflows > 0 ? "text-moss" : "text-ink-3"
              )}
            >
              {point.inflows > 0 ? `+${formatMoney(point.inflows, baseCurrency)}` : "—"}
            </span>
          </div>

          <div className="pt-2.5 border-t border-line/60">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3 block">
              Outflows
            </span>
            <span
              className={cn(
                "mt-1 block font-mono font-semibold tabular-nums",
                point.outflows > 0 ? "text-ink" : "text-ink-3"
              )}
            >
              {point.outflows > 0 ? `-${formatMoney(point.outflows, baseCurrency)}` : "—"}
            </span>
          </div>

          <div className="col-span-2 pt-2.5 border-t border-line/60 flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3">
              Daily net change
            </span>
            <span
              className={cn(
                "font-mono font-semibold tabular-nums",
                isPositiveNet
                  ? "text-moss"
                  : isNegativeNet
                  ? "text-ember-ink"
                  : "text-ink-3"
              )}
            >
              {isPositiveNet ? "+" : isNegativeNet ? "-" : ""}
              {formatMoney(Math.abs(point.netChange), baseCurrency)}
            </span>
          </div>
        </div>

        {/* Scheduled events preview */}
        {point.inflowEvents.length === 0 && point.outflowEvents.length === 0 ? (
          <p className="text-xs text-ink-3 py-2">
            No scheduled inflows or outflows maturing on this date.
          </p>
        ) : (
          <div className="flex flex-col gap-3 text-xs">
            {point.inflowEvents.length > 0 && (
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3 block mb-1.5">
                  Maturing inflows ({point.inflowEvents.length})
                </span>
                <div className="rounded-[12px] border border-line divide-y divide-line bg-white">
                  {point.inflowEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-ink truncate block">
                          {ev.clientName}
                        </span>
                        <span className="text-[11px] font-mono text-ink-3">
                          {ev.invoiceNumber}
                          {ev.isOverdue ? " · Overdue" : ""}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-moss whitespace-nowrap tabular-nums">
                        +{formatMoney(ev.amount, baseCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {point.outflowEvents.length > 0 && (
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3 block mb-1.5">
                  Scheduled outflows ({point.outflowEvents.length})
                </span>
                <div className="rounded-[12px] border border-line divide-y divide-line bg-white">
                  {point.outflowEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-ink truncate block">
                          {ev.title}
                        </span>
                        <span className="text-[11px] font-mono text-ink-3">
                          {ev.category}
                          {ev.isOverdue ? " · Overdue" : ""}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-ink whitespace-nowrap tabular-nums">
                        -{formatMoney(ev.amount, baseCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
