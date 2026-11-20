"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  SlidersHorizontal,
  Plus,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
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
          <div className="flex flex-wrap items-center gap-3 self-start md:self-end shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsSettingsOpen(true)}
              className="h-10 px-4 rounded-full text-xs font-medium border border-line hover:border-ink-3"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
              Adjust liquidity reserve
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsExpenseDrawerOpen(true)}
              className="h-10 px-5 rounded-full text-xs font-medium bg-ink text-white hover:bg-ink-hover"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Schedule outflow
            </Button>
          </div>
        </div>
      </header>

      {/* 4-Metric Strip */}
      <section aria-label="Key treasury figures" className="py-8 border-b border-line">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Column 1: Current Cash (Liquid Reserve) */}
          <div>
            <p className="text-[13px] text-ink-3 font-medium uppercase tracking-[0.06em]">
              Current cash (liquid reserve)
            </p>
            <div className="mt-1">
              <Figure value={summary.openingBalance} currency={baseCurrency} size="lg" />
            </div>
            <p className="mt-0.5 text-xs text-ink-3">Verified opening balance</p>
          </div>

          {/* Column 2: Safety Buffer Threshold */}
          <div>
            <p className="text-[13px] text-ink-3 font-medium uppercase tracking-[0.06em]">
              Safety buffer threshold
            </p>
            <div className="mt-1">
              <Figure value={summary.safetyBuffer} currency={baseCurrency} size="lg" />
            </div>
            <p className="mt-0.5 text-xs text-ink-3">Red-alert minimum cash</p>
          </div>

          {/* Column 3: 30-Day Net Trajectory */}
          <div>
            <p className="text-[13px] text-ink-3 font-medium uppercase tracking-[0.06em]">
              30-day net trajectory
            </p>
            <div className="mt-1 flex items-baseline gap-1">
              <Figure value={summary.net30DayChange} currency={baseCurrency} size="lg" />
            </div>
            <p
              className={cn(
                "mt-0.5 text-xs font-medium",
                summary.net30DayChange >= 0 ? "text-moss" : "text-ember-ink"
              )}
            >
              {summary.net30DayChange >= 0
                ? "Positive liquidity growth"
                : "Projected net cash reduction"}
            </p>
          </div>

          {/* Column 4: Lowest Forecast Point */}
          <div>
            <p className="text-[13px] text-ink-3 font-medium uppercase tracking-[0.06em]">
              Lowest forecast point
            </p>
            <div className="mt-1">
              <Figure value={summary.minProjectedBalance} currency={baseCurrency} size="lg" />
            </div>
            {hasBreach ? (
              <div className="mt-1 flex items-center gap-1.5">
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
        <div className="rounded-[16px] border border-line bg-white p-6 sm:p-8">
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
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3 mr-1">
                Scenario
              </span>
              <div className="inline-flex h-9 p-1 rounded-full bg-fog border border-line/60">
                <button
                  type="button"
                  onClick={() => handleModeChange("expected")}
                  className={cn(
                    "px-3.5 rounded-full text-xs font-medium transition-colors select-none",
                    mode === "expected"
                      ? "bg-white text-ink shadow-[var(--shadow-thumb)]"
                      : "text-ink-3 hover:text-ink"
                  )}
                >
                  Expected (latency-adjusted)
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("onTime")}
                  className={cn(
                    "px-3.5 rounded-full text-xs font-medium transition-colors select-none",
                    mode === "onTime"
                      ? "bg-white text-ink shadow-[var(--shadow-thumb)]"
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
          <div className="mt-6 p-4 rounded-[12px] bg-fog/60 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-white border border-line text-xs font-mono font-semibold text-ink">
                <Calendar className="w-3.5 h-3.5 text-ink-3" />
                <span>
                  Day {activePoint.dayIndex} ({activePoint.displayDate}, {activePoint.dayOfWeek})
                </span>
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase text-ink-3 block">
                  Projected balance
                </span>
                <span className="text-sm font-serif font-bold text-ink">
                  {formatMoney(activePoint.closingBalance, baseCurrency)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div>
                <span className="text-ink-3 block text-[11px] font-mono uppercase">Inflows</span>
                <span className="font-semibold text-moss">
                  +{formatMoney(activePoint.inflows, baseCurrency)}
                </span>
              </div>
              <div>
                <span className="text-ink-3 block text-[11px] font-mono uppercase">Outflows</span>
                <span className="font-semibold text-ink">
                  {activePoint.outflows > 0 ? "\u2212" : ""}
                  {formatMoney(activePoint.outflows, baseCurrency)}
                </span>
              </div>
              <div>
                <span className="text-ink-3 block text-[11px] font-mono uppercase">Net change</span>
                <span
                  className={cn(
                    "font-semibold",
                    activePoint.netChange > 0
                      ? "text-moss"
                      : activePoint.netChange < 0
                      ? "text-ember-ink"
                      : "text-ink-3"
                  )}
                >
                  {activePoint.netChange > 0 ? "+" : activePoint.netChange < 0 ? "\u2212" : ""}
                  {formatMoney(Math.abs(activePoint.netChange), baseCurrency)}
                </span>
              </div>
              <div className="sm:border-l sm:border-line sm:pl-4">
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
          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTableFilter("ALL")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors select-none",
                tableFilter === "ALL"
                  ? "bg-ink text-white"
                  : "bg-fog text-ink hover:bg-fog-2"
              )}
            >
              All days ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setTableFilter("INFLOWS")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors select-none",
                tableFilter === "INFLOWS"
                  ? "bg-ink text-white"
                  : "bg-fog text-ink hover:bg-fog-2"
              )}
            >
              Inflow days ({counts.inflows})
            </button>
            <button
              type="button"
              onClick={() => setTableFilter("OUTFLOWS")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors select-none",
                tableFilter === "OUTFLOWS"
                  ? "bg-ink text-white"
                  : "bg-fog text-ink hover:bg-fog-2"
              )}
            >
              Outflow days ({counts.outflows})
            </button>
            <button
              type="button"
              onClick={() => setTableFilter("DEFICITS")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors select-none",
                tableFilter === "DEFICITS"
                  ? "bg-ember-ink text-white"
                  : "bg-fog text-ink hover:bg-fog-2"
              )}
            >
              Deficit days ({counts.deficits})
            </button>
          </div>
        </div>

        {/* Ledger Table Container */}
        <div className="mt-4 border border-line rounded-[14px] overflow-hidden bg-white">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredPoints.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-ink-3">
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
                          <div className="flex items-center gap-1.5">
                            <span>{point.displayDate}</span>
                            <span className="text-ink-3 font-normal">({point.dayOfWeek})</span>
                            {point.dayIndex === 0 && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-fog-2 text-ink-2 font-mono">
                                Today
                              </span>
                            )}
                          </div>
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
                                {"\u2212"}{formatMoney(point.outflows, baseCurrency)}
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
                            {isPositive ? "+" : isNegative ? "\u2212" : ""}
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
