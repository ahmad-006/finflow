"use client";

import * as React from "react";
import type { ARAgingBuckets } from "@/modules/clients/types";
import { Money } from "@/components/data/Money";
import { cn } from "@/lib/utils";

interface ARAgingBarProps {
  aging: ARAgingBuckets;
  currency?: string;
  className?: string;
}

export function ARAgingBar({ aging, currency = "PKR", className }: ARAgingBarProps) {
  const total = aging.totalOutstanding;

  // Calculate percentages for the distribution bar (default to 0 if total is 0)
  const currentPct = total > 0 ? (aging.current / total) * 100 : 0;
  const days1to30Pct = total > 0 ? (aging.days1to30 / total) * 100 : 0;
  const days31to60Pct = total > 0 ? (aging.days31to60 / total) * 100 : 0;
  const days61to90Pct = total > 0 ? (aging.days61to90 / total) * 100 : 0;
  const days90PlusPct = total > 0 ? (aging.days90Plus / total) * 100 : 0;

  return (
    <div className={cn("flex flex-col gap-5 py-6 border-b border-line", className)}>
      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3">
        <div>
          <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-ink-3">
            Receivables Schedule
          </span>
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
            Accounts Receivable Aging
          </h2>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-start md:items-end">
            <span className="text-[12px] text-ink-3">Total Outstanding</span>
            <span className="text-base font-semibold text-ink">
              <Money amount={aging.totalOutstanding} currency={currency} />
            </span>
          </div>

          <div className="h-8 w-[1px] bg-line" aria-hidden="true" />

          <div className="flex flex-col items-start md:items-end">
            <span className="text-[12px] text-ink-3">Overdue Delinquency</span>
            <span className={cn(
              "text-base font-semibold",
              aging.totalOverdue > 0 ? "text-ember-ink" : "text-moss"
            )}>
              <Money amount={aging.totalOverdue} currency={currency} />
            </span>
          </div>
        </div>
      </div>

      {total > 0 ? (
        <div className="flex flex-col gap-3">
          {/* Proportional Segmented Track */}
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-fog border border-line/40">
            {currentPct > 0 && (
              <div
                style={{ width: `${currentPct}%` }}
                className="bg-moss transition-all duration-300"
                title={`Current (Not Due): ${currentPct.toFixed(1)}%`}
              />
            )}
            {days1to30Pct > 0 && (
              <div
                style={{ width: `${days1to30Pct}%` }}
                className="bg-amber/70 transition-all duration-300"
                title={`1-30 Days Overdue: ${days1to30Pct.toFixed(1)}%`}
              />
            )}
            {days31to60Pct > 0 && (
              <div
                style={{ width: `${days31to60Pct}%` }}
                className="bg-amber transition-all duration-300"
                title={`31-60 Days Overdue: ${days31to60Pct.toFixed(1)}%`}
              />
            )}
            {days61to90Pct > 0 && (
              <div
                style={{ width: `${days61to90Pct}%` }}
                className="bg-ember transition-all duration-300"
                title={`61-90 Days Overdue: ${days61to90Pct.toFixed(1)}%`}
              />
            )}
            {days90PlusPct > 0 && (
              <div
                style={{ width: `${days90PlusPct}%` }}
                className="bg-ember-ink transition-all duration-300"
                title={`90+ Days Overdue: ${days90PlusPct.toFixed(1)}%`}
              />
            )}
          </div>

          {/* Aging Brackets Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 text-xs">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-ink-3">
                <span className="h-2 w-2 rounded-full bg-moss inline-block" />
                <span>Current</span>
              </div>
              <span className="font-medium text-ink">
                <Money amount={aging.current} currency={currency} />
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-ink-3">
                <span className="h-2 w-2 rounded-full bg-amber/70 inline-block" />
                <span>1–30 Days</span>
              </div>
              <span className="font-medium text-ink">
                <Money amount={aging.days1to30} currency={currency} />
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-ink-3">
                <span className="h-2 w-2 rounded-full bg-amber inline-block" />
                <span>31–60 Days</span>
              </div>
              <span className="font-medium text-ink">
                <Money amount={aging.days31to60} currency={currency} />
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-ink-3">
                <span className="h-2 w-2 rounded-full bg-ember inline-block" />
                <span>61–90 Days</span>
              </div>
              <span className="font-medium text-ink">
                <Money amount={aging.days61to90} currency={currency} />
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-ink-3">
                <span className="h-2 w-2 rounded-full bg-ember-ink inline-block" />
                <span>90+ Days</span>
              </div>
              <span className="font-medium text-ink">
                <Money amount={aging.days90Plus} currency={currency} />
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-2 text-xs text-ink-3">
          All historical invoices are settled. There are currently zero open receivables.
        </div>
      )}
    </div>
  );
}
