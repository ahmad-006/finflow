"use client";

import * as React from "react";
import Link from "next/link";
import { InkLine } from "@/components/line/InkLine";
import { Ruler } from "@/components/line/Ruler";
import { Figure } from "@/components/line/Figure";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { renderOverviewBreach, renderOverviewNoBreach, StatementSentence } from "@/lib/sentences";
import { formatMoney } from "@/lib/format";
import { recordPaymentAction } from "@/modules/invoices/actions";
import type { ForecastSummary, ForecastMode } from "@/modules/treasury/types";
import { cn } from "@/lib/utils";

export interface ActionableInvoice {
  id: string;
  client: string;
  number: string;
  dueText: string;
  amount: number;
  status: "SENT" | "OVERDUE" | "PAID";
  daysOverdue?: number;
  dueDate: string;
}

export interface ActionableExpense {
  id: string;
  title: string;
  category: string;
  dueText: string;
  amount: number;
  dueDate: string;
}

export interface DashboardOverviewClientViewProps {
  initialForecast: ForecastSummary;
  initialOverdueInvoices: ActionableInvoice[];
  initialUpcomingInvoices: ActionableInvoice[];
  initialUpcomingExpenses: ActionableExpense[];
  baseCurrency?: string;
}

export function DashboardOverviewClientView({
  initialForecast,
  initialOverdueInvoices,
  initialUpcomingInvoices,
  initialUpcomingExpenses,
  baseCurrency = "PKR",
}: DashboardOverviewClientViewProps) {
  const [forecastMode, setForecastMode] = React.useState<ForecastMode>("expected");
  const [activeDay, setActiveDay] = React.useState<number>(0);
  const [overdueInvoices, setOverdueInvoices] = React.useState<ActionableInvoice[]>(initialOverdueInvoices);
  const [liquidCash, setLiquidCash] = React.useState<number>(initialForecast.openingBalance);
  const [recentlySettledId, setRecentlySettledId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setOverdueInvoices(initialOverdueInvoices);
    setLiquidCash(initialForecast.openingBalance);
  }, [initialForecast, initialOverdueInvoices]);

  const forecastValues = React.useMemo(() => {
    return forecastMode === "expected"
      ? initialForecast.expectedCurve
      : initialForecast.onTimeCurve;
  }, [forecastMode, initialForecast]);

  const onTimeGhost = React.useMemo(() => {
    return forecastMode === "expected" ? initialForecast.onTimeCurve : undefined;
  }, [forecastMode, initialForecast]);

  const handleMarkPaid = async (id: string, amount: number) => {
    setOverdueInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status: "PAID" as const } : inv))
    );
    setLiquidCash((prev) => prev + amount);
    setRecentlySettledId(id);

    try {
      await recordPaymentAction({
        invoiceId: id,
        paidAmount: amount,
      });
    } catch (err) {
      console.error("Failed to mark invoice as paid:", err);
    }

    setTimeout(() => setRecentlySettledId(null), 1200);
  };

  const activeOverdue = overdueInvoices.filter((i) => i.status === "OVERDUE");
  const overdueCount = activeOverdue.length;
  const overdueTotal = activeOverdue.reduce((sum, i) => sum + i.amount, 0);

  const hasBreach = initialForecast.maxDeficitAmount > 0 && initialForecast.firstBreachDate !== null;

  return (
    <div className="w-full bg-white text-ink font-sans">
      <h1 className="sr-only">Overview</h1>

      {/* Band 1: White band - Hero Figure & Live InkLine Chart */}
      <section className="bg-white pt-6 pb-8 md:pt-8 md:pb-10">
        <div className="mx-auto max-w-[1200px] px-[var(--gutter)]">
          {/* Header row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-[13px] text-ink-3 font-medium uppercase tracking-[0.06em]">
                Liquid cash today
              </p>
              <div className="mt-1 transition-colors duration-500">
                <Figure value={liquidCash} currency={baseCurrency} size="xl" />
              </div>
              <div className="mt-2">
                <StatementSentence>
                  {hasBreach ? (
                    renderOverviewBreach(
                      formatMoney(initialForecast.maxDeficitAmount, baseCurrency),
                      initialForecast.firstBreachDate || "30 Nov",
                      initialForecast.breachDurationDays || 1
                    )
                  ) : (
                    renderOverviewNoBreach(
                      formatMoney(initialForecast.minProjectedBalance, baseCurrency),
                      initialForecast.minBalanceDate || "30 days"
                    )
                  )}
                </StatementSentence>
              </div>
            </div>

            {/* Segmented Control: [On time | Expected] */}
            <div className="flex flex-col items-start md:items-end gap-1.5 self-start md:self-end">
              <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-ink-3">
                Forecast Scenario
              </span>
              <div className="inline-flex h-9 p-1 rounded-full bg-fog">
                <button
                  type="button"
                  onClick={() => setForecastMode("onTime")}
                  className={cn(
                    "px-3.5 rounded-full text-xs font-medium transition-all select-none",
                    forecastMode === "onTime"
                      ? "bg-white text-ink shadow-[var(--shadow-thumb)]"
                      : "text-ink-3 hover:text-ink"
                  )}
                >
                  On time
                </button>
                <button
                  type="button"
                  onClick={() => setForecastMode("expected")}
                  className={cn(
                    "px-3.5 rounded-full text-xs font-medium transition-all select-none",
                    forecastMode === "expected"
                      ? "bg-white text-ink shadow-[var(--shadow-thumb)]"
                      : "text-ink-3 hover:text-ink"
                  )}
                >
                  Expected
                </button>
              </div>
            </div>
          </div>

          {/* Graph Subtitle & Legend */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-3 border-t border-line/60 pt-4">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-ink">30-Day Cash Runway Projection</span>
              <span className="hidden sm:inline">
                · Daily trajectory under{" "}
                {forecastMode === "expected"
                  ? "risk-adjusted payment latency"
                  : "strict on-time contractual due dates"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 bg-ink inline-block rounded-full" />
                <span>Liquid Cash</span>
              </div>
              {onTimeGhost && (
                <div className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3.5 border-b border-dashed border-ink-3 inline-block" />
                  <span>On-Time Ghost</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 bg-ember inline-block rounded-full" />
                <span>Buffer Breach</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 border-b border-dashed border-line-strong inline-block" />
                <span>Buffer Floor ({formatMoney(initialForecast.safetyBuffer, baseCurrency)})</span>
              </div>
            </div>
          </div>

          {/* InkLine Graphic */}
          <div className="mt-2 h-[220px] sm:h-[250px] w-full">
            <InkLine
              values={forecastValues}
              ghost={onTimeGhost}
              buffer={initialForecast.safetyBuffer}
              height={250}
              currency={baseCurrency}
              label="30-day liquid cash forecast"
              showBufferLabel={true}
            />
          </div>

          {/* 31-day Day Ruler with Today and Scrubber */}
          <div className="mt-1">
            <Ruler
              days={31}
              activeDay={activeDay}
              onSelectDay={setActiveDay}
              ariaLabel="Overview 30-day timeline"
            />
          </div>
        </div>
      </section>

      {/* Band 2: Fog band - 4 Supporting Figures directly on band */}
      <section className="bg-fog py-10 md:py-12">
        <div className="mx-auto max-w-[1200px] px-[var(--gutter)]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Column 1: Receivables */}
            <div>
              <p className="text-[13px] text-ink-3 font-medium">Receivables, 30 days</p>
              <div className="mt-1">
                <Figure value={initialForecast.total30DayInflow} currency={baseCurrency} size="lg" />
              </div>
              <p className="mt-0.5 text-xs text-ink-3">Committed client inflows</p>
            </div>

            {/* Column 2: Overdue */}
            <div>
              <p className="text-[13px] text-ink-3 font-medium">Overdue</p>
              <div className="mt-1">
                <Figure value={overdueTotal} currency={baseCurrency} size="lg" />
              </div>
              <p className="mt-0.5 text-xs text-ember-ink font-medium">
                {overdueCount} {overdueCount === 1 ? "invoice" : "invoices"}
              </p>
            </div>

            {/* Column 3: Lowest balance */}
            <div>
              <p className="text-[13px] text-ink-3 font-medium">Lowest projected point</p>
              <div className="mt-1">
                <Figure value={initialForecast.minProjectedBalance} currency={baseCurrency} size="lg" />
              </div>
              <p className="mt-0.5 text-xs text-ink-3">
                Expected on {initialForecast.minBalanceDate}
              </p>
            </div>

            {/* Column 4: First day below buffer */}
            <div>
              <p className="text-[13px] text-ink-3 font-medium">First day below buffer</p>
              <p
                className={cn(
                  "mt-1 text-2xl sm:text-[28px] leading-tight tracking-[-0.025em] font-light",
                  hasBreach ? "text-ember-ink" : "text-moss font-normal"
                )}
              >
                {initialForecast.firstBreachDate || "None"}
              </p>
              <p className="mt-0.5 text-xs text-ink-3">
                {hasBreach
                  ? `${formatMoney(initialForecast.maxDeficitAmount, baseCurrency)} deficit`
                  : "Safe above buffer for 30 days"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Band 3: White band - Ledger Rows (Needs attention & Next 14 days) */}
      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-[1200px] px-[var(--gutter)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Left Ledger: Needs attention */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-line-strong">
                <h2 className="text-[24px] font-semibold text-ink tracking-tight">
                  Needs attention
                </h2>
                <Link
                  href="/invoices"
                  className="text-xs text-ink-3 hover:text-ink font-medium transition-colors"
                >
                  View all invoices →
                </Link>
              </div>

              <div className="divide-y divide-line">
                {/* Breach Warning Row */}
                {hasBreach && (
                  <div className="py-5 flex items-center justify-between">
                    <div>
                      <p className="text-[17px] font-medium text-ember-ink">
                        Cash falls below your buffer
                      </p>
                      <p className="text-[14px] text-ink-3 mt-0.5">
                        {formatMoney(initialForecast.maxDeficitAmount, baseCurrency)} short on{" "}
                        {initialForecast.firstBreachDate}
                      </p>
                    </div>
                    <Badge variant="critical">Breach</Badge>
                  </div>
                )}

                {/* Overdue Invoice Rows */}
                {activeOverdue.length === 0 && !hasBreach ? (
                  <div className="py-8 text-center text-xs text-ink-3">
                    No overdue receivables. All collection cycles are current.
                  </div>
                ) : (
                  activeOverdue.map((inv) => (
                    <div
                      key={inv.id}
                      className={cn(
                        "py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 transition-colors",
                        recentlySettledId === inv.id && "bg-moss-tint/40 rounded-[14px] px-3 -mx-3"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-[16px] sm:text-[17px] font-medium text-ink truncate">
                          {inv.client}
                        </p>
                        <p className="text-[13px] sm:text-[14px] text-ink-3 mt-0.5">
                          {inv.number} · {inv.dueText}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                        <Figure value={inv.amount} currency={baseCurrency} size="row" />
                        {inv.status === "PAID" ? (
                          <Badge variant="paid">Paid</Badge>
                        ) : (
                          <Button
                            variant="secondary"
                            size="compact"
                            onClick={() => handleMarkPaid(inv.id, inv.amount)}
                          >
                            Mark paid
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Ledger: Next 14 days */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-line-strong">
                <h2 className="text-[24px] font-semibold text-ink tracking-tight">
                  Next 14 days
                </h2>
                <Link
                  href="/cash-flow"
                  className="text-xs text-ink-3 hover:text-ink font-medium transition-colors"
                >
                  View cash waterfall →
                </Link>
              </div>

              <div className="divide-y divide-line">
                {initialUpcomingInvoices.length === 0 && initialUpcomingExpenses.length === 0 ? (
                  <div className="py-8 text-center text-xs text-ink-3">
                    No scheduled inflows or outflows maturing over the next 14 days.
                  </div>
                ) : (
                  <>
                    {initialUpcomingInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-[16px] sm:text-[17px] font-medium text-ink truncate">
                            {inv.client}
                          </p>
                          <p className="text-[13px] sm:text-[14px] text-ink-3 mt-0.5">
                            {inv.number} · {inv.dueText}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                          <Figure value={inv.amount} currency={baseCurrency} size="row" />
                          <Badge variant="sent">Sent</Badge>
                        </div>
                      </div>
                    ))}

                    {initialUpcomingExpenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-[16px] sm:text-[17px] font-medium text-ink truncate">
                            {exp.title}
                          </p>
                          <p className="text-[13px] sm:text-[14px] text-ink-3 mt-0.5">
                            {exp.category} · {exp.dueText}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                          <span className="text-[16px] sm:text-[17px] font-medium text-ink tabular-nums">
                            {formatMoney(exp.amount, baseCurrency)}
                          </span>
                          <Badge variant="draft">Outflow</Badge>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
