"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Decimal from "decimal.js";
import { InkLine } from "@/components/line/InkLine";
import { Ruler } from "@/components/line/Ruler";
import { Figure } from "@/components/line/Figure";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { renderOverviewBreach, renderOverviewNoBreach, StatementSentence } from "@/lib/sentences";
import { formatMoney } from "@/lib/format";
import { canManageBilling } from "@/modules/auth/rbac";
import { recordPaymentAction } from "@/modules/invoices/actions";
import { markExpensePaidAction } from "@/modules/expenses/actions";
import { getForecastAction } from "@/modules/treasury/actions";
import type { InvoiceCurrency } from "@/modules/invoices/types";
import type { ForecastSummary, ForecastMode, DailyForecastPoint } from "@/modules/treasury/types";
import { cn } from "@/lib/utils";

export interface ActionableInvoice {
  id: string;
  client: string;
  number: string;
  dueText: string;
  amount: number;
  remainingNativeAmount?: number;
  currency?: InvoiceCurrency;
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
  isPaid?: boolean;
}

export interface DashboardOverviewClientViewProps {
  initialForecast: ForecastSummary;
  initialOnTimeForecast?: ForecastSummary;
  initialOverdueInvoices: ActionableInvoice[];
  initialUpcomingInvoices: ActionableInvoice[];
  initialUpcomingExpenses: ActionableExpense[];
  baseCurrency?: string;
  role?: string;
}

export function DashboardOverviewClientView({
  initialForecast,
  initialOnTimeForecast,
  initialOverdueInvoices,
  initialUpcomingInvoices,
  initialUpcomingExpenses,
  baseCurrency = "PKR",
  role = "MEMBER",
}: DashboardOverviewClientViewProps) {
  const router = useRouter();
  const canPayBilling = canManageBilling(role);

  const [forecastMode, setForecastMode] = React.useState<ForecastMode>("expected");
  const [forecastOverride, setForecastOverride] = React.useState<{
    base: ForecastSummary;
    mode: ForecastMode;
    data: ForecastSummary;
  } | null>(null);
  const [activeDay, setActiveDay] = React.useState<number>(0);
  const [settledInvoiceIds, setSettledInvoiceIds] = React.useState<string[]>([]);
  const [settledExpenseIds, setSettledExpenseIds] = React.useState<string[]>([]);
  const [recentlySettledId, setRecentlySettledId] = React.useState<string | null>(null);
  const [recentlySettledExpenseId, setRecentlySettledExpenseId] = React.useState<string | null>(null);
  const [isSettlingExpenseId, setIsSettlingExpenseId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const currentForecast = React.useMemo(() => {
    if (
      forecastOverride &&
      forecastOverride.base === initialForecast &&
      forecastOverride.mode === forecastMode
    ) {
      return forecastOverride.data;
    }
    if (forecastMode === "onTime" && initialOnTimeForecast) {
      return initialOnTimeForecast;
    }
    return initialForecast;
  }, [forecastOverride, forecastMode, initialForecast, initialOnTimeForecast]);

  const overdueInvoices = React.useMemo(
    () =>
      initialOverdueInvoices.map((inv) =>
        settledInvoiceIds.includes(inv.id) ? { ...inv, status: "PAID" as const } : inv
      ),
    [initialOverdueInvoices, settledInvoiceIds]
  );

  const upcomingInvoices = React.useMemo(
    () =>
      initialUpcomingInvoices.map((inv) =>
        settledInvoiceIds.includes(inv.id) ? { ...inv, status: "PAID" as const } : inv
      ),
    [initialUpcomingInvoices, settledInvoiceIds]
  );

  const upcomingExpenses = React.useMemo(
    () =>
      initialUpcomingExpenses.map((exp) =>
        settledExpenseIds.includes(exp.id) ? { ...exp, isPaid: true } : exp
      ),
    [initialUpcomingExpenses, settledExpenseIds]
  );

  const liquidCash = React.useMemo(() => {
    let cash = new Decimal(initialForecast.openingBalance);
    for (const inv of initialOverdueInvoices) {
      if (settledInvoiceIds.includes(inv.id)) {
        cash = cash.plus(inv.amount);
      }
    }
    for (const inv of initialUpcomingInvoices) {
      if (settledInvoiceIds.includes(inv.id)) {
        cash = cash.plus(inv.amount);
      }
    }
    for (const exp of initialUpcomingExpenses) {
      if (settledExpenseIds.includes(exp.id)) {
        cash = Decimal.max(0, cash.minus(exp.amount));
      }
    }
    return cash.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }, [
    initialForecast.openingBalance,
    initialOverdueInvoices,
    initialUpcomingInvoices,
    initialUpcomingExpenses,
    settledInvoiceIds,
    settledExpenseIds,
  ]);

  const handleModeChange = (newMode: ForecastMode) => {
    if (newMode === forecastMode) return;
    setForecastMode(newMode);

    startTransition(async () => {
      try {
        const res = await getForecastAction(newMode);
        if (res.success && res.data) {
          setForecastOverride({
            base: initialForecast,
            mode: newMode,
            data: res.data,
          });
        }
      } catch (err) {
        console.error("Failed to switch forecast scenario:", err);
      }
    });
  };

  const forecastValues = React.useMemo(() => {
    return forecastMode === "expected"
      ? currentForecast.expectedCurve
      : currentForecast.onTimeCurve;
  }, [forecastMode, currentForecast]);

  const onTimeGhost = React.useMemo(() => {
    return forecastMode === "expected" ? currentForecast.onTimeCurve : undefined;
  }, [forecastMode, currentForecast]);

  const safeActiveDay = Math.min(
    Math.max(0, activeDay),
    Math.max(0, (currentForecast.dailyPoints?.length || 1) - 1)
  );
  const activePoint: DailyForecastPoint =
    currentForecast.dailyPoints?.[safeActiveDay] || {
      dayIndex: safeActiveDay,
      date: "",
      displayDate: `Day ${safeActiveDay}`,
      dayOfWeek: "",
      openingBalance: liquidCash,
      inflows: 0,
      outflows: 0,
      netChange: 0,
      closingBalance: forecastValues[safeActiveDay] ?? liquidCash,
      isBreach: (forecastValues[safeActiveDay] ?? liquidCash) < currentForecast.safetyBuffer,
      deficitAmount: Math.max(0, currentForecast.safetyBuffer - (forecastValues[safeActiveDay] ?? liquidCash)),
      inflowEvents: [],
      outflowEvents: [],
    };

  const day0Base = currentForecast.dailyPoints?.[0]?.closingBalance ?? currentForecast.openingBalance;
  const netDelta = activePoint.closingBalance - day0Base;
  const bufferMargin = activePoint.closingBalance - currentForecast.safetyBuffer;

  const handleMarkInvoicePaid = async (inv: ActionableInvoice) => {
    const nativeAmount = inv.remainingNativeAmount ?? inv.amount;
    if (nativeAmount <= 0) return;

    setSettledInvoiceIds((prev) => (prev.includes(inv.id) ? prev : [...prev, inv.id]));
    setRecentlySettledId(inv.id);

    try {
      const res = await recordPaymentAction({
        invoiceId: inv.id,
        paidAmount: nativeAmount,
      });
      if (!res.success) {
        setSettledInvoiceIds((prev) => prev.filter((itemId) => itemId !== inv.id));
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to mark invoice as paid:", err);
      setSettledInvoiceIds((prev) => prev.filter((itemId) => itemId !== inv.id));
    }

    setTimeout(() => setRecentlySettledId(null), 1200);
  };

  const handleMarkExpensePaid = async (id: string) => {
    setSettledExpenseIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setRecentlySettledExpenseId(id);
    setIsSettlingExpenseId(id);

    try {
      const res = await markExpensePaidAction(id);
      if (!res.success) {
        console.error("Failed to mark expense as paid:", res.error);
        setSettledExpenseIds((prev) => prev.filter((itemId) => itemId !== id));
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to mark expense as paid:", err);
      setSettledExpenseIds((prev) => prev.filter((itemId) => itemId !== id));
    } finally {
      setIsSettlingExpenseId(null);
      setTimeout(() => setRecentlySettledExpenseId(null), 1200);
    }
  };

  const activeOverdue = overdueInvoices.filter((i) => i.status === "OVERDUE");
  const overdueCount = activeOverdue.length;
  const overdueTotal = activeOverdue.reduce((sum, i) => sum + i.amount, 0);

  const hasBreach = currentForecast.maxDeficitAmount > 0 && currentForecast.firstBreachDate !== null;

  return (
    <div className="w-full bg-white text-ink font-sans">
      <h1 className="sr-only">Overview</h1>

      {/* Band 1: White band - Hero Figure & Live InkLine Chart */}
      <section className="bg-white pt-6 pb-8 md:pt-8 md:pb-10">
        <div className="mx-auto max-w-[1200px] px-[var(--gutter)]">
          {/* Header row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              {activeDay === 0 ? (
                <p className="text-[13px] text-ink-3 font-medium uppercase tracking-[0.06em]">
                  Liquid cash today
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] text-ink-3 font-medium uppercase tracking-[0.06em]">
                    Projected cash · Day {activeDay} ({activePoint.displayDate})
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveDay(0)}
                    className="text-xs text-ink-3 hover:text-ink underline transition-colors cursor-pointer min-h-[44px] lg:min-h-0 inline-flex items-center"
                  >
                    Reset to today
                  </button>
                </div>
              )}
              <div className="mt-1 transition-colors duration-500 overflow-hidden">
                <Figure
                  value={activeDay === 0 ? liquidCash : activePoint.closingBalance}
                  currency={baseCurrency}
                  size="xl"
                  className="max-w-full text-[clamp(28px,8vw,52px)] sm:text-[clamp(36px,4.5vw,52px)]"
                />
              </div>
              {activeDay === 0 ? (
                <div className="mt-2">
                  <StatementSentence className="text-[17px] sm:text-[21px] leading-[25px] sm:leading-[30px] break-words">
                    {hasBreach ? (
                      renderOverviewBreach(
                        formatMoney(currentForecast.maxDeficitAmount, baseCurrency),
                        currentForecast.firstBreachDate || "30 Nov",
                        currentForecast.breachDurationDays || 1
                      )
                    ) : (
                      renderOverviewNoBreach(
                        formatMoney(currentForecast.minProjectedBalance, baseCurrency),
                        currentForecast.minBalanceDate || "30 days"
                      )
                    )}
                  </StatementSentence>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-2.5">
                  <Badge variant={netDelta >= 0 ? "healthy" : "critical"}>
                    {netDelta >= 0 ? `+${formatMoney(netDelta, baseCurrency)}` : `-${formatMoney(Math.abs(netDelta), baseCurrency)}`} from Day 0
                  </Badge>
                  <span className="text-[13px] sm:text-[14px]">
                    {bufferMargin >= 0 ? (
                      <span className="text-moss font-medium">
                        +{formatMoney(bufferMargin, baseCurrency)} buffer margin
                      </span>
                    ) : (
                      <span className="text-ember-ink font-medium">
                        {formatMoney(Math.abs(bufferMargin), baseCurrency)} buffer deficit
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveDay(0)}
                    className="text-xs text-ink-3 hover:text-ink underline transition-colors cursor-pointer min-h-[44px] lg:min-h-0 inline-flex items-center"
                  >
                    Reset to today
                  </button>
                </div>
              )}
            </div>

            {/* Segmented Control: [On time | Expected] */}
            <div className="flex flex-col items-start md:items-end gap-1.5 self-start md:self-end w-full sm:w-auto">
              <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-ink-3">
                Forecast Scenario
              </span>
              <div className="inline-flex min-h-[52px] lg:min-h-0 h-auto lg:h-9 p-1 rounded-full bg-fog w-full sm:w-auto items-center">
                <button
                  type="button"
                  onClick={() => handleModeChange("onTime")}
                  className={cn(
                    "flex-1 sm:flex-initial px-4 lg:px-3.5 rounded-full text-xs font-medium transition-all select-none min-h-[44px] lg:min-h-[28px] flex items-center justify-center cursor-pointer",
                    forecastMode === "onTime"
                      ? "bg-white text-ink shadow-[var(--shadow-thumb)]"
                      : "text-ink-3 hover:text-ink"
                  )}
                >
                  On time
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("expected")}
                  className={cn(
                    "flex-1 sm:flex-initial px-4 lg:px-3.5 rounded-full text-xs font-medium transition-all select-none min-h-[44px] lg:min-h-[28px] flex items-center justify-center cursor-pointer",
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
                <span>Buffer Floor ({formatMoney(currentForecast.safetyBuffer, baseCurrency)})</span>
              </div>
            </div>
          </div>

          {/* InkLine Graphic */}
          <div className="mt-2 h-[220px] sm:h-[250px] w-full">
            <InkLine
              values={forecastValues}
              ghost={onTimeGhost}
              buffer={currentForecast.safetyBuffer}
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
              activeDay={safeActiveDay}
              onSelectDay={setActiveDay}
              ariaLabel="Overview 30-day timeline"
            />
          </div>

          {/* Synchronized timeline scrubber controls */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveDay((prev) => Math.max(0, prev - 1))}
                disabled={safeActiveDay === 0}
                className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-lg border border-line bg-white hover:bg-fog disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-ink transition-colors cursor-pointer inline-flex items-center justify-center select-none"
                aria-label="Previous day"
              >
                ← Prev day
              </button>
              <button
                type="button"
                onClick={() => setActiveDay((prev) => Math.min(30, prev + 1))}
                disabled={safeActiveDay >= 30}
                className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-lg border border-line bg-white hover:bg-fog disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-ink transition-colors cursor-pointer inline-flex items-center justify-center select-none"
                aria-label="Next day"
              >
                Next day →
              </button>
            </div>
            {safeActiveDay !== 0 && (
              <button
                type="button"
                onClick={() => setActiveDay(0)}
                className="min-h-[44px] px-3.5 py-2 rounded-lg border border-line bg-white hover:bg-fog text-xs font-medium text-ink transition-colors cursor-pointer inline-flex items-center justify-center select-none"
              >
                Reset to today
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Band 2: Fog band - 4 Supporting Figures directly on band */}
      <section className="bg-fog py-10 md:py-12">
        <div className="mx-auto max-w-[1200px] px-[var(--gutter)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Column 1: Receivables */}
            <div>
              <p className="text-[13px] text-ink-3 font-medium">Receivables, 30 days</p>
              <div className="mt-1">
                <Figure value={currentForecast.total30DayInflow} currency={baseCurrency} size="lg" />
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
                <Figure value={currentForecast.minProjectedBalance} currency={baseCurrency} size="lg" />
              </div>
              <p className="mt-0.5 text-xs text-ink-3">
                Expected on {currentForecast.minBalanceDate}
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
                {currentForecast.firstBreachDate || "None"}
              </p>
              <p className="mt-0.5 text-xs text-ink-3">
                {hasBreach
                  ? `${formatMoney(currentForecast.maxDeficitAmount, baseCurrency)} deficit`
                  : "Safe above buffer for 30 days"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Band 3: White band - Ledger Rows (Needs attention & Next 14 days) */}
      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-[1200px] px-[var(--gutter)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left Ledger: Needs attention */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-line-strong">
                <h2 className="text-[20px] sm:text-[24px] font-semibold text-ink tracking-tight">
                  Needs attention
                </h2>
                <Link
                  href="/invoices"
                  className="text-xs text-ink-3 hover:text-ink font-medium transition-colors min-h-[44px] inline-flex items-center"
                >
                  View all invoices →
                </Link>
              </div>

              <div className="divide-y divide-line sm:divide-y">
                {/* Breach Warning Row */}
                {hasBreach && (
                  <div className="p-4 sm:p-0 sm:py-5 rounded-[12px] sm:rounded-none bg-ember-tint/40 sm:bg-transparent border border-ember/20 sm:border-0 sm:border-b sm:border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 my-2 sm:my-0">
                    <div>
                      <p className="text-[16px] sm:text-[17px] font-medium text-ember-ink">
                        Cash falls below your buffer
                      </p>
                      <p className="text-[13px] sm:text-[14px] text-ink-3 mt-0.5">
                        {formatMoney(currentForecast.maxDeficitAmount, baseCurrency)} short on{" "}
                        {currentForecast.firstBreachDate}
                      </p>
                    </div>
                    <div className="self-start sm:self-auto">
                      <Badge variant="critical">Breach</Badge>
                    </div>
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
                        "p-4 sm:p-0 sm:py-5 rounded-[12px] sm:rounded-none bg-fog/40 sm:bg-transparent border border-line sm:border-0 sm:border-b sm:border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 my-2 sm:my-0 transition-colors",
                        recentlySettledId === inv.id && "bg-moss-tint/40 sm:bg-moss-tint/40 rounded-[12px] sm:rounded-[14px] sm:px-3 sm:-mx-3"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center justify-between sm:block">
                          <p className="text-[16px] sm:text-[17px] font-medium text-ink truncate">
                            {inv.client}
                          </p>
                          <span className="sm:hidden">
                            <Badge variant={inv.status === "PAID" ? "paid" : "overdue"}>
                              {inv.status === "PAID" ? "Paid" : "Overdue"}
                            </Badge>
                          </span>
                        </div>
                        <p className="text-[13px] sm:text-[14px] text-ink-3 mt-0.5">
                          {inv.number} · {inv.dueText}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t border-line/60 sm:border-0">
                        <Figure value={inv.amount} currency={baseCurrency} size="row" />
                        {inv.status === "PAID" ? (
                          <Badge variant="paid" className="hidden sm:inline-flex">Paid</Badge>
                        ) : canPayBilling ? (
                          <Button
                            variant="secondary"
                            size="compact"
                            onClick={() => handleMarkInvoicePaid(inv)}
                            className="min-h-[44px] lg:min-h-[36px]"
                          >
                            Mark paid
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Ledger: Next 14 days */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-line-strong">
                <h2 className="text-[20px] sm:text-[24px] font-semibold text-ink tracking-tight">
                  Next 14 days
                </h2>
                <Link
                  href="/cash-flow"
                  className="text-xs text-ink-3 hover:text-ink font-medium transition-colors min-h-[44px] inline-flex items-center"
                >
                  View cash waterfall →
                </Link>
              </div>

              <div className="divide-y divide-line sm:divide-y">
                {upcomingInvoices.length === 0 && upcomingExpenses.length === 0 ? (
                  <div className="py-8 text-center text-xs text-ink-3">
                    No scheduled inflows or outflows maturing over the next 14 days.
                  </div>
                ) : (
                  <>
                    {upcomingInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className={cn(
                          "p-4 sm:p-0 sm:py-5 rounded-[12px] sm:rounded-none bg-fog/40 sm:bg-transparent border border-line sm:border-0 sm:border-b sm:border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 my-2 sm:my-0 transition-colors",
                          recentlySettledId === inv.id && "bg-moss-tint/40 sm:bg-moss-tint/40 rounded-[12px] sm:rounded-[14px] sm:px-3 sm:-mx-3"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center justify-between sm:block">
                            <p className="text-[16px] sm:text-[17px] font-medium text-ink truncate">
                              {inv.client}
                            </p>
                            <span className="sm:hidden">
                              <Badge variant={inv.status === "PAID" ? "paid" : "sent"}>
                                {inv.status === "PAID" ? "Paid" : "Sent"}
                              </Badge>
                            </span>
                          </div>
                          <p className="text-[13px] sm:text-[14px] text-ink-3 mt-0.5">
                            {inv.number} · {inv.dueText}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t border-line/60 sm:border-0">
                          <Figure value={inv.amount} currency={baseCurrency} size="row" />
                          {inv.status === "PAID" ? (
                            <Badge variant="paid" className="hidden sm:inline-flex">Paid</Badge>
                          ) : canPayBilling ? (
                            <Button
                              variant="secondary"
                              size="compact"
                              onClick={() => handleMarkInvoicePaid(inv)}
                              className="min-h-[44px] lg:min-h-[36px]"
                            >
                              Mark paid
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}

                    {upcomingExpenses.map((exp) => (
                      <div
                        key={exp.id}
                        className={cn(
                          "p-4 sm:p-0 sm:py-5 rounded-[12px] sm:rounded-none bg-fog/40 sm:bg-transparent border border-line sm:border-0 sm:border-b sm:border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 my-2 sm:my-0 transition-colors",
                          recentlySettledExpenseId === exp.id && "bg-moss-tint/40 sm:bg-moss-tint/40 rounded-[12px] sm:rounded-[14px] sm:px-3 sm:-mx-3"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center justify-between sm:block">
                            <p className="text-[16px] sm:text-[17px] font-medium text-ink truncate">
                              {exp.title}
                            </p>
                            <span className="sm:hidden">
                              <Badge variant={exp.isPaid ? "paid" : "draft"}>
                                {exp.isPaid ? "Paid" : "Outflow"}
                              </Badge>
                            </span>
                          </div>
                          <p className="text-[13px] sm:text-[14px] text-ink-3 mt-0.5">
                            {exp.category} · {exp.dueText}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t border-line/60 sm:border-0">
                          <Figure value={exp.amount} currency={baseCurrency} size="row" />
                          {exp.isPaid ? (
                            <Badge variant="paid" className="hidden sm:inline-flex">Paid</Badge>
                          ) : canPayBilling ? (
                            <Button
                              variant="secondary"
                              size="compact"
                              onClick={() => handleMarkExpensePaid(exp.id)}
                              className="min-h-[44px] lg:min-h-[36px]"
                              isLoading={isSettlingExpenseId === exp.id}
                            >
                              Mark paid
                            </Button>
                          ) : null}
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
