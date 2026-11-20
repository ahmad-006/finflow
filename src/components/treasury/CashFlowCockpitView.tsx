"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SlidersHorizontal,
  Plus,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  HelpCircle,
  Filter,
} from "lucide-react";
import type {
  ForecastSummary,
  ForecastMode,
  DailyForecastPoint,
} from "@/modules/treasury/types";
import { getForecastAction } from "@/modules/treasury/actions";
import { InkLine } from "@/components/line/InkLine";
import { Ruler } from "@/components/line/Ruler";
import { Figure } from "@/components/line/Figure";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import {
  renderOverviewBreach,
  renderOverviewNoBreach,
  StatementSentence,
} from "@/lib/sentences";
import { TreasurySettingsModal } from "./TreasurySettingsModal";
import { ExpenseFormDrawer } from "@/components/expenses/ExpenseFormDrawer";
import { cn } from "@/lib/utils";

export interface CashFlowCockpitViewProps {
  initialForecast: ForecastSummary;
}

type TableFilter = "ALL" | "INFLOWS" | "OUTFLOWS" | "DEFICITS";

export function CashFlowCockpitView({
  initialForecast,
}: CashFlowCockpitViewProps) {
  const router = useRouter();

  // Mode and active scrubber day
  const [mode, setMode] = React.useState<ForecastMode>("expected");
  const [activeDay, setActiveDay] = React.useState<number>(0);
  const [summary, setSummary] = React.useState<ForecastSummary>(initialForecast);
  const [tableFilter, setTableFilter] = React.useState<TableFilter>("ALL");
  const [isPendingMode, startModeTransition] = React.useTransition();

  // Modals and Drawers
  const [isSettingsOpen, setIsSettingsOpen] = React.useState<boolean>(false);
  const [isExpenseDrawerOpen, setIsExpenseDrawerOpen] = React.useState<boolean>(false);

  // Sync state if initialForecast changes from server
  React.useEffect(() => {
    setSummary(initialForecast);
  }, [initialForecast]);

  const baseCurrency = summary.baseCurrency || "PKR";

  // Handle Scenario Mode Switch
  const handleModeChange = (newMode: ForecastMode) => {
    if (newMode === mode) return;
    setMode(newMode);

    startModeTransition(async () => {
      try {
        const res = await getForecastAction(newMode);
        if (res.success && res.data) {
          setSummary(res.data);
        }
      } catch (err) {
        console.error("Failed to switch forecast scenario:", err);
      }
    });
  };

  // Active series values
  const activeCurve = mode === "expected" ? summary.expectedCurve : summary.onTimeCurve;
  const onTimeGhost = mode === "expected" ? summary.onTimeCurve : undefined;

  // Selected day point for scrub preview
  const safeActiveDay = Math.min(Math.max(0, activeDay), summary.dailyPoints.length - 1);
  const activePoint: DailyForecastPoint = summary.dailyPoints[safeActiveDay] || summary.dailyPoints[0];

  // Breach identification
  const hasBreach = summary.maxDeficitAmount > 0 || summary.firstBreachDate !== null;

  // Filtered waterfall table points
  const filteredPoints = React.useMemo(() => {
    return summary.dailyPoints.filter((point) => {
      if (tableFilter === "INFLOWS") return point.inflows > 0;
      if (tableFilter === "OUTFLOWS") return point.outflows > 0;
      if (tableFilter === "DEFICITS") return point.isBreach;
      return true;
    });
  }, [summary.dailyPoints, tableFilter]);

  // Counts for filter pills
  const counts = React.useMemo(() => {
    let inflowCount = 0;
    let outflowCount = 0;
    let deficitCount = 0;
    for (const p of summary.dailyPoints) {
      if (p.inflows > 0) inflowCount++;
      if (p.outflows > 0) outflowCount++;
      if (p.isBreach) deficitCount++;
    }
    return {
      all: summary.dailyPoints.length,
      inflows: inflowCount,
      outflows: outflowCount,
      deficits: deficitCount,
    };
  }, [summary.dailyPoints]);

  return (
    <div className="w-full bg-white text-ink font-sans">
      {/* Header section with breadcrumb, title, and action pills */}
      <header className="pb-6 border-b border-line">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-ink-3 mb-2 font-mono uppercase tracking-wider"
        >
          <span>Treasury &amp; Forecasting</span>
          <span className="text-line-strong">/</span>
          <span className="text-ink font-medium">Cash Flow</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-[32px] sm:text-[38px] leading-tight font-light text-ink tracking-tight">
              Cash flow forecast
            </h1>
            <div className="mt-3">
              <StatementSentence>
                {hasBreach ? (
                  renderOverviewBreach(
                    formatMoney(summary.maxDeficitAmount, baseCurrency),
                    summary.firstBreachDate ?? summary.minBalanceDate,
                    summary.breachDurationDays > 0 ? summary.breachDurationDays : 1
                  )
                ) : (
                  renderOverviewNoBreach(
                    formatMoney(summary.minProjectedBalance, baseCurrency),
                    summary.minBalanceDate
                  )
                )}
              </StatementSentence>
            </div>
          </div>

          {/* Action pills */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0 self-start md:self-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsSettingsOpen(true)}
              className="min-h-[44px] px-4 rounded-full text-xs font-medium border border-line hover:border-ink-3 flex items-center justify-center"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Adjust liquidity reserve</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsExpenseDrawerOpen(true)}
              className="min-h-[44px] px-5 rounded-full text-xs font-medium bg-ink text-white hover:bg-ink-hover flex items-center justify-center"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Schedule outflow</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 4-Metric Strip */}
      <section aria-label="Key treasury figures" className="py-8 border-b border-line">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Column 1: Current Cash (Liquid Reserve) */}
          <div className="min-w-0">
            <p className="text-[11px] sm:text-[13px] text-ink-3 font-medium uppercase tracking-[0.06em] truncate">
              Current cash (liquid reserve)
            </p>
            <div className="mt-1">
              <Figure value={summary.openingBalance} currency={baseCurrency} size="lg" />
            </div>
            <p className="mt-0.5 text-xs text-ink-3">Verified opening balance</p>
          </div>

          {/* Column 2: Safety Buffer Threshold */}
          <div className="min-w-0">
            <p className="text-[11px] sm:text-[13px] text-ink-3 font-medium uppercase tracking-[0.06em] truncate">
              Safety buffer threshold
            </p>
            <div className="mt-1">
              <Figure value={summary.safetyBuffer} currency={baseCurrency} size="lg" />
            </div>
            <p className="mt-0.5 text-xs text-ink-3">Red-alert minimum cash</p>
          </div>

          {/* Column 3: 30-Day Net Trajectory */}
          <div className="min-w-0">
            <p className="text-[11px] sm:text-[13px] text-ink-3 font-medium uppercase tracking-[0.06em] truncate">
              30-day net trajectory
            </p>
            <div className="mt-1 flex items-baseline gap-1">
              <Figure value={summary.net30DayChange} currency={baseCurrency} size="lg" />
            </div>
            <p
              className={cn(
                "mt-0.5 text-xs font-medium truncate",
                summary.net30DayChange >= 0 ? "text-moss" : "text-ember-ink"
              )}
            >
              {summary.net30DayChange >= 0
                ? "Positive liquidity growth"
                : "Projected net cash reduction"}
            </p>
          </div>

          {/* Column 4: Lowest Forecast Point */}
          <div className="min-w-0">
            <p className="text-[11px] sm:text-[13px] text-ink-3 font-medium uppercase tracking-[0.06em] truncate">
              Lowest forecast point
            </p>
            <div className="mt-1">
              <Figure value={summary.minProjectedBalance} currency={baseCurrency} size="lg" />
            </div>
            {hasBreach ? (
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-ember-tint text-ember-ink border border-ember/20">
                  Breach on {summary.minBalanceDate}
                </span>
              </div>
            ) : (
              <p className="mt-0.5 text-xs text-ink-3">Floor on {summary.minBalanceDate}</p>
            )}
          </div>
        </div>
      </section>

      {/* Interactive Forecast Curve Card Container */}
      <section aria-label="Interactive forecast curve" className="my-8">
        <div className="rounded-[16px] border border-line bg-white p-4 sm:p-6 lg:p-8">
          {/* Card Top Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line/70">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-ink tracking-tight">
                  30-day liquidity trajectory
                </h2>
                {isPendingMode && (
                  <span className="text-[11px] font-mono text-ink-3">Updating...</span>
                )}
              </div>
              <p className="text-xs text-ink-3 mt-0.5">
                {mode === "expected"
                  ? "Adjusted for client historical payment latency and 0.70 overdue collection factor."
                  : "Contractual invoice due dates without latency adjustments."}
              </p>
            </div>

            {/* Segmented Control */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3">
                Scenario
              </span>
              <div className="flex flex-col sm:flex-row p-1 rounded-[16px] sm:rounded-full bg-fog border border-line/60 w-full sm:w-auto gap-1 sm:gap-0">
                <button
                  type="button"
                  onClick={() => handleModeChange("expected")}
                  className={cn(
                    "min-h-[44px] px-3.5 py-2 rounded-full text-xs font-medium transition-colors select-none text-center flex items-center justify-center leading-tight",
                    mode === "expected"
                      ? "bg-white text-ink border border-line font-semibold"
                      : "text-ink-3 hover:text-ink"
                  )}
                >
                  Expected (latency-adjusted)
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("onTime")}
                  className={cn(
                    "min-h-[44px] px-3.5 py-2 rounded-full text-xs font-medium transition-colors select-none text-center flex items-center justify-center leading-tight",
                    mode === "onTime"
                      ? "bg-white text-ink border border-line font-semibold"
                      : "text-ink-3 hover:text-ink"
                  )}
                >
                  On-time (due dates)
                </button>
              </div>
            </div>
          </div>

          {/* Curve legend */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-3">
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 bg-ink inline-block rounded-full" />
              <span>Projected cash</span>
            </div>
            {onTimeGhost && (
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 border-b border-dashed border-ink-3 inline-block" />
                <span>On-time scenario</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 bg-ember inline-block rounded-full" />
              <span>Buffer breach</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 border-b border-dashed border-line-strong inline-block" />
              <span>Safety buffer ({formatMoney(summary.safetyBuffer, baseCurrency)})</span>
            </div>
          </div>

          {/* InkLine SVG Canvas */}
          <div className="mt-4 h-[230px] sm:h-[260px] w-full">
            <InkLine
              values={activeCurve}
              ghost={onTimeGhost}
              buffer={summary.safetyBuffer}
              height={260}
              currency={baseCurrency}
              label="30-day liquid cash forecast"
              showBufferLabel={true}
            />
          </div>

          {/* Day Ruler Timeline */}
          <div className="mt-2">
            <Ruler
              days={31}
              activeDay={safeActiveDay}
              onSelectDay={setActiveDay}
              ariaLabel="30-day cash timeline scrub"
            />
          </div>

          {/* Synchronized Day Scrub Inspection Ribbon */}
          <div className="mt-6 p-3.5 sm:p-4 rounded-[12px] bg-fog/60 border border-line flex flex-col gap-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-white border border-line text-xs font-mono font-semibold text-ink shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                  <span>
                    Day {activePoint.dayIndex} ({activePoint.displayDate}, {activePoint.dayOfWeek})
                  </span>
                </div>
              </div>
              <div className="flex items-baseline justify-between sm:justify-start gap-2">
                <span className="text-[11px] font-mono uppercase text-ink-3">
                  Projected balance:
                </span>
                <span className="text-sm sm:text-base font-serif font-bold text-ink">
                  {formatMoney(activePoint.closingBalance, baseCurrency)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-line/60 text-xs">
              <div className="min-w-0">
                <span className="text-ink-3 block text-[10px] sm:text-[11px] font-mono uppercase truncate">
                  Inflows
                </span>
                <span className="font-semibold text-moss block truncate">
                  +{formatMoney(activePoint.inflows, baseCurrency)}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-ink-3 block text-[10px] sm:text-[11px] font-mono uppercase truncate">
                  Outflows
                </span>
                <span className="font-semibold text-ink block truncate">
                  {activePoint.outflows > 0 ? "-" : ""}
                  {formatMoney(activePoint.outflows, baseCurrency)}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-ink-3 block text-[10px] sm:text-[11px] font-mono uppercase truncate">
                  Net change
                </span>
                <span
                  className={cn(
                    "font-semibold block truncate",
                    activePoint.netChange > 0
                      ? "text-moss"
                      : activePoint.netChange < 0
                      ? "text-ember-ink"
                      : "text-ink-3"
                  )}
                >
                  {activePoint.netChange > 0 ? "+" : activePoint.netChange < 0 ? "-" : ""}
                  {formatMoney(Math.abs(activePoint.netChange), baseCurrency)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-0.5">
              <div className="min-w-0 truncate">
                {activePoint.isBreach ? (
                  <Badge variant="critical">
                    Deficit: {formatMoney(activePoint.deficitAmount, baseCurrency)}
                  </Badge>
                ) : activePoint.closingBalance < summary.safetyBuffer * 1.25 ? (
                  <Badge variant="watchlist">Buffer warning</Badge>
                ) : (
                  <Badge variant="healthy">Healthy</Badge>
                )}
              </div>
              <Link
                href={`/cash-flow/${activePoint.date}?mode=${mode}`}
                className="inline-flex items-center justify-center min-h-[44px] px-3.5 py-2 rounded-full text-xs font-mono font-medium text-ink bg-white hover:bg-fog border border-line transition-colors shrink-0"
              >
                <span>Day details</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Daily Cash Flow Waterfall & Ledger Table */}
      <section aria-label="Daily cash flow ledger" className="my-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
          <div>
            <h2 className="text-xl font-serif text-ink tracking-tight">
              Daily cash flow waterfall and ledger
            </h2>
            <p className="text-xs text-ink-3 mt-0.5">
              Line by line maturity schedule across receivables, payables, and projected balance.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setTableFilter("ALL")}
              className={cn(
                "min-h-[44px] px-3.5 py-2 rounded-full text-xs font-medium transition-colors select-none flex items-center justify-center",
                tableFilter === "ALL"
                  ? "bg-ink text-white"
                  : "bg-fog text-ink hover:bg-fog-2 border border-line/60"
              )}
            >
              All days ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setTableFilter("INFLOWS")}
              className={cn(
                "min-h-[44px] px-3.5 py-2 rounded-full text-xs font-medium transition-colors select-none flex items-center justify-center",
                tableFilter === "INFLOWS"
                  ? "bg-ink text-white"
                  : "bg-fog text-ink hover:bg-fog-2 border border-line/60"
              )}
            >
              Inflow days ({counts.inflows})
            </button>
            <button
              type="button"
              onClick={() => setTableFilter("OUTFLOWS")}
              className={cn(
                "min-h-[44px] px-3.5 py-2 rounded-full text-xs font-medium transition-colors select-none flex items-center justify-center",
                tableFilter === "OUTFLOWS"
                  ? "bg-ink text-white"
                  : "bg-fog text-ink hover:bg-fog-2 border border-line/60"
              )}
            >
              Outflow days ({counts.outflows})
            </button>
            <button
              type="button"
              onClick={() => setTableFilter("DEFICITS")}
              className={cn(
                "min-h-[44px] px-3.5 py-2 rounded-full text-xs font-medium transition-colors select-none flex items-center justify-center",
                tableFilter === "DEFICITS"
                  ? "bg-ember-ink text-white"
                  : "bg-fog text-ink hover:bg-fog-2 border border-line/60"
              )}
            >
              Deficit days ({counts.deficits})
            </button>
          </div>
        </div>

        {/* Ledger Mobile Cards Container (< md) */}
        <div className="mt-4 space-y-3 block md:hidden">
          {filteredPoints.length === 0 ? (
            <div className="py-8 px-4 text-center text-xs text-ink-3 rounded-[12px] border border-line bg-fog/20">
              No days match the selected filter.
            </div>
          ) : (
            filteredPoints.map((point) => {
              const isSelected = point.dayIndex === safeActiveDay;
              const isPositive = point.netChange > 0;
              const isNegative = point.netChange < 0;

              let statusVariant: "healthy" | "watchlist" | "critical" = "healthy";
              let statusLabel = "Healthy";

              if (point.isBreach) {
                statusVariant = "critical";
                statusLabel = "Critical deficit";
              } else if (point.closingBalance < summary.safetyBuffer * 1.25) {
                statusVariant = "watchlist";
                statusLabel = "Buffer warning";
              }

              return (
                <div
                  key={point.dayIndex}
                  onClick={() => setActiveDay(point.dayIndex)}
                  className={cn(
                    "p-4 rounded-[12px] border transition-colors cursor-pointer",
                    isSelected
                      ? "border-ink bg-fog/40"
                      : "border-line bg-white hover:bg-fog/20"
                  )}
                >
                  {/* Card Header: Date & Status Badge */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-line/60">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm text-ink">
                        {point.displayDate}
                      </span>
                      <span className="text-xs text-ink-3">
                        ({point.dayOfWeek})
                      </span>
                      {point.dayIndex === 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-fog-2 text-ink-2 font-mono">
                          Today
                        </span>
                      )}
                    </div>
                    <Badge variant={statusVariant}>{statusLabel}</Badge>
                  </div>

                  {/* Flows Breakdown */}
                  <div className="py-3 space-y-2.5 text-xs">
                    {/* Inflows */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[11px] font-mono uppercase text-ink-3 block">
                          Maturing inflows
                        </span>
                        {point.inflowEvents.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {point.inflowEvents.slice(0, 2).map((ev) => (
                              <span
                                key={ev.id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-fog text-ink-2"
                              >
                                <span className="truncate max-w-[120px]">{ev.clientName}</span>
                                {ev.isOverdue && (
                                  <span className="text-ember-ink font-semibold">Overdue</span>
                                )}
                              </span>
                            ))}
                            {point.inflowEvents.length > 2 && (
                              <span className="text-[10px] text-ink-3 self-center">
                                +{point.inflowEvents.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span
                        className={cn(
                          "font-semibold font-mono whitespace-nowrap",
                          point.inflows > 0 ? "text-moss" : "text-ink-3"
                        )}
                      >
                        {point.inflows > 0 ? `+${formatMoney(point.inflows, baseCurrency)}` : "—"}
                      </span>
                    </div>

                    {/* Outflows */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[11px] font-mono uppercase text-ink-3 block">
                          Maturing outflows
                        </span>
                        {point.outflowEvents.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {point.outflowEvents.slice(0, 2).map((ev) => (
                              <span
                                key={ev.id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-fog text-ink-2"
                              >
                                <span className="truncate max-w-[120px]">{ev.title}</span>
                                <span className="text-ink-3">({ev.category})</span>
                              </span>
                            ))}
                            {point.outflowEvents.length > 2 && (
                              <span className="text-[10px] text-ink-3 self-center">
                                +{point.outflowEvents.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span
                        className={cn(
                          "font-semibold font-mono whitespace-nowrap",
                          point.outflows > 0 ? "text-ink" : "text-ink-3"
                        )}
                      >
                        {point.outflows > 0 ? `-${formatMoney(point.outflows, baseCurrency)}` : "—"}
                      </span>
                    </div>

                    {/* Net Change and Balance */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line/60">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-ink-3 block">
                          Daily net change
                        </span>
                        <span
                          className={cn(
                            "font-mono font-semibold text-xs",
                            isPositive
                              ? "text-moss"
                              : isNegative
                              ? "text-ember-ink"
                              : "text-ink-3"
                          )}
                        >
                          {isPositive ? "+" : isNegative ? "-" : ""}
                          {formatMoney(Math.abs(point.netChange), baseCurrency)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase text-ink-3 block">
                          Projected balance
                        </span>
                        <span className="font-serif font-bold text-sm text-ink">
                          {formatMoney(point.closingBalance, baseCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Details Link button with 44px min height */}
                  <div className="pt-2 border-t border-line/60">
                    <Link
                      href={`/cash-flow/${point.date}?mode=${mode}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-line bg-fog hover:bg-fog-2 text-xs font-mono font-medium text-ink transition-colors"
                    >
                      <span>View day details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Ledger Table Container (Desktop >= md) */}
        <div className="mt-4 border border-line rounded-[14px] overflow-hidden bg-white hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-fog/60 border-b border-line text-ink-3 font-mono uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Maturing inflows</th>
                  <th className="py-3 px-4">Maturing outflows</th>
                  <th className="py-3 px-4 text-right">Daily net change</th>
                  <th className="py-3 px-4 text-right">Projected balance</th>
                  <th className="py-3 px-4 text-center">Health status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredPoints.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ink-3">
                      No days match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredPoints.map((point) => {
                    const isSelected = point.dayIndex === safeActiveDay;
                    const isPositive = point.netChange > 0;
                    const isNegative = point.netChange < 0;

                    let statusVariant: "healthy" | "watchlist" | "critical" = "healthy";
                    let statusLabel = "Healthy";

                    if (point.isBreach) {
                      statusVariant = "critical";
                      statusLabel = "Critical deficit";
                    } else if (point.closingBalance < summary.safetyBuffer * 1.25) {
                      statusVariant = "watchlist";
                      statusLabel = "Buffer warning";
                    }

                    return (
                      <tr
                        key={point.dayIndex}
                        onClick={() => setActiveDay(point.dayIndex)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isSelected
                            ? "bg-fog border-l-4 border-ink"
                            : "hover:bg-fog/50"
                        )}
                      >
                        {/* Date Column */}
                        <td className="py-3.5 px-4 font-medium text-ink whitespace-nowrap">
                          <Link
                            href={`/cash-flow/${point.date}?mode=${mode}`}
                            className="hover:underline flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>{point.displayDate}</span>
                            <span className="text-ink-3 font-normal">({point.dayOfWeek})</span>
                            {point.dayIndex === 0 && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-fog-2 text-ink-2 font-mono">
                                Today
                              </span>
                            )}
                          </Link>
                        </td>

                        {/* Maturing Inflows */}
                        <td className="py-3.5 px-4">
                          {point.inflows > 0 ? (
                            <div className="flex flex-col gap-1 max-w-[260px]">
                              <span className="font-semibold text-moss">
                                +{formatMoney(point.inflows, baseCurrency)}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {point.inflowEvents.slice(0, 2).map((ev) => (
                                  <span
                                    key={ev.id}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-fog text-ink-2"
                                  >
                                    <span className="truncate max-w-[120px]">{ev.clientName}</span>
                                    {ev.isOverdue && (
                                      <span className="text-ember-ink font-semibold">Overdue</span>
                                    )}
                                  </span>
                                ))}
                                {point.inflowEvents.length > 2 && (
                                  <span className="text-[10px] text-ink-3 self-center">
                                    +{point.inflowEvents.length - 2} more
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-ink-3">—</span>
                          )}
                        </td>

                        {/* Maturing Outflows */}
                        <td className="py-3.5 px-4">
                          {point.outflows > 0 ? (
                            <div className="flex flex-col gap-1 max-w-[260px]">
                              <span className="font-semibold text-ink">
                                -{formatMoney(point.outflows, baseCurrency)}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {point.outflowEvents.slice(0, 2).map((ev) => (
                                  <span
                                    key={ev.id}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-fog text-ink-2"
                                  >
                                    <span className="truncate max-w-[120px]">{ev.title}</span>
                                    <span className="text-ink-3">({ev.category})</span>
                                  </span>
                                ))}
                                {point.outflowEvents.length > 2 && (
                                  <span className="text-[10px] text-ink-3 self-center">
                                    +{point.outflowEvents.length - 2} more
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-ink-3">—</span>
                          )}
                        </td>

                        {/* Daily Net Change */}
                        <td className="py-3.5 px-4 text-right font-mono font-medium whitespace-nowrap">
                          <span
                            className={cn(
                              isPositive
                                ? "text-moss"
                                : isNegative
                                ? "text-ember-ink"
                                : "text-ink-3"
                            )}
                          >
                            {isPositive ? "+" : isNegative ? "-" : ""}
                            {formatMoney(Math.abs(point.netChange), baseCurrency)}
                          </span>
                        </td>

                        {/* Projected Balance */}
                        <td className="py-3.5 px-4 text-right font-serif font-bold text-ink whitespace-nowrap">
                          {formatMoney(point.closingBalance, baseCurrency)}
                        </td>

                        {/* Health Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <Badge variant={statusVariant}>{statusLabel}</Badge>
                        </td>

                        {/* Details Action */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Link
                            href={`/cash-flow/${point.date}?mode=${mode}`}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-ink-3 hover:text-ink hover:underline transition-colors"
                            title={`Inspect ${point.displayDate}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>Details</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Explanatory Footer Container */}
      <footer className="rounded-[16px] border border-line bg-fog/40 p-6 sm:p-8 mt-12 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-4 h-4 text-ink-3" />
          <h2 className="text-base font-semibold text-ink tracking-tight">
            How this forecast works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-ink-2 leading-relaxed">
          <div>
            <h3 className="font-semibold text-ink mb-1">Dynamic latency adjustment</h3>
            <p>
              Inflow dates reflect each client historical settlement timing. If a client pays 12 days
              after invoice due date on average, receivables shift forward 12 days in the expected
              trajectory.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-ink mb-1">Past-due collection haircut</h3>
            <p>
              Overdue receivables on Day 0 include a 30 percent haircut (0.70 collection factor).
              This accounts for collection delays and non-payment risk on aged debt.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-ink mb-1">Operational liabilities</h3>
            <p>
              Accounts payable and recurring expenses are recognized at full nominal value on their
              exact scheduled dates.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-ink mb-1">Safety buffer protection</h3>
            <p>
              Deficit alerts trigger when projected liquidity falls below your safety buffer
              threshold, marking risk windows in the curve and waterfall table.
            </p>
          </div>
        </div>
      </footer>

      {/* Modals and Drawers */}
      <TreasurySettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentReserve={summary.openingBalance}
        currentBuffer={summary.safetyBuffer}
        baseCurrency={baseCurrency}
        onSuccess={(newReserve, newBuffer) => {
          setSummary((prev) => ({
            ...prev,
            openingBalance: newReserve,
            safetyBuffer: newBuffer,
          }));
          router.refresh();
        }}
      />

      <ExpenseFormDrawer
        isOpen={isExpenseDrawerOpen}
        onClose={() => setIsExpenseDrawerOpen(false)}
        baseCurrency={baseCurrency}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
