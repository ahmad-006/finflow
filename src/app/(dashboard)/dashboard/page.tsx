"use client";

import * as React from "react";
import Link from "next/link";

interface ActionableInvoice {
  id: string;
  client: string;
  status: "PAID" | "SENT" | "OVERDUE";
  dueText: string;
  amount: number;
  isOverdue: boolean;
}

interface ForecastDay {
  dayNumber: number;
  date: string;
  fullDate: string;
  isoDate: string;
  inflow: number;
  outflow: number;
  baseClosing: number;
}

const INITIAL_INVOICES: ActionableInvoice[] = [
  {
    id: "INV-092",
    client: "Zainab Textiles",
    status: "SENT",
    dueText: "Due in 2 days",
    amount: 420000,
    isOverdue: false,
  },
  {
    id: "INV-090",
    client: "Karachi Logistics Corp",
    status: "OVERDUE",
    dueText: "6 days overdue",
    amount: 285000,
    isOverdue: true,
  },
  {
    id: "INV-088",
    client: "Crescent Garments Ltd",
    status: "OVERDUE",
    dueText: "12 days overdue",
    amount: 190000,
    isOverdue: true,
  },
  {
    id: "INV-086",
    client: "Lahore Cotton Mills",
    status: "OVERDUE",
    dueText: "18 days overdue",
    amount: 140000,
    isOverdue: true,
  },
  {
    id: "INV-093",
    client: "Indus Pharma Wholesale",
    status: "SENT",
    dueText: "Due in 5 days",
    amount: 540000,
    isOverdue: false,
  },
  {
    id: "INV-094",
    client: "Apex Tech Solutions",
    status: "SENT",
    dueText: "Due in 9 days",
    amount: 365000,
    isOverdue: false,
  },
];

// 30 days SME Treasury Rolling Forecast Baseline
const BASE_FORECAST_DAYS: { date: string; fullDate: string; isoDate: string; inflow: number; outflow: number }[] = [
  { date: "Nov 14", fullDate: "Nov 14, 2026", isoDate: "2026-11-14", inflow: 0, outflow: 120000 },
  { date: "Nov 15", fullDate: "Nov 15, 2026", isoDate: "2026-11-15", inflow: 0, outflow: 65000 },
  { date: "Nov 16", fullDate: "Nov 16, 2026", isoDate: "2026-11-16", inflow: 420000, outflow: 80000 },
  { date: "Nov 17", fullDate: "Nov 17, 2026", isoDate: "2026-11-17", inflow: 0, outflow: 95000 },
  { date: "Nov 18", fullDate: "Nov 18, 2026", isoDate: "2026-11-18", inflow: 540000, outflow: 110000 },
  { date: "Nov 19", fullDate: "Nov 19, 2026", isoDate: "2026-11-19", inflow: 0, outflow: 75000 },
  { date: "Nov 20", fullDate: "Nov 20, 2026", isoDate: "2026-11-20", inflow: 150000, outflow: 450000 },
  { date: "Nov 21", fullDate: "Nov 21, 2026", isoDate: "2026-11-21", inflow: 0, outflow: 60000 },
  { date: "Nov 22", fullDate: "Nov 22, 2026", isoDate: "2026-11-22", inflow: 365000, outflow: 130000 },
  { date: "Nov 23", fullDate: "Nov 23, 2026", isoDate: "2026-11-23", inflow: 0, outflow: 85000 },
  { date: "Nov 24", fullDate: "Nov 24, 2026", isoDate: "2026-11-24", inflow: 280000, outflow: 90000 },
  { date: "Nov 25", fullDate: "Nov 25, 2026", isoDate: "2026-11-25", inflow: 0, outflow: 720000 },
  { date: "Nov 26", fullDate: "Nov 26, 2026", isoDate: "2026-11-26", inflow: 0, outflow: 140000 },
  { date: "Nov 27", fullDate: "Nov 27, 2026", isoDate: "2026-11-27", inflow: 684500, outflow: 120000 },
  { date: "Nov 28", fullDate: "Nov 28, 2026", isoDate: "2026-11-28", inflow: 780000, outflow: 80000 },
  { date: "Nov 29", fullDate: "Nov 29, 2026", isoDate: "2026-11-29", inflow: 350000, outflow: 110000 },
  { date: "Nov 30", fullDate: "Nov 30, 2026", isoDate: "2026-11-30", inflow: 350000, outflow: 450000 },
  { date: "Dec 01", fullDate: "Dec 01, 2026", isoDate: "2026-12-01", inflow: 450000, outflow: 180000 },
  { date: "Dec 02", fullDate: "Dec 02, 2026", isoDate: "2026-12-02", inflow: 0, outflow: 95000 },
  { date: "Dec 03", fullDate: "Dec 03, 2026", isoDate: "2026-12-03", inflow: 180000, outflow: 70000 },
  { date: "Dec 04", fullDate: "Dec 04, 2026", isoDate: "2026-12-04", inflow: 0, outflow: 60000 },
  { date: "Dec 05", fullDate: "Dec 05, 2026", isoDate: "2026-12-05", inflow: 520000, outflow: 115000 },
  { date: "Dec 06", fullDate: "Dec 06, 2026", isoDate: "2026-12-06", inflow: 0, outflow: 85000 },
  { date: "Dec 07", fullDate: "Dec 07, 2026", isoDate: "2026-12-07", inflow: 0, outflow: 90000 },
  { date: "Dec 08", fullDate: "Dec 08, 2026", isoDate: "2026-12-08", inflow: 310000, outflow: 140000 },
  { date: "Dec 09", fullDate: "Dec 09, 2026", isoDate: "2026-12-09", inflow: 0, outflow: 75000 },
  { date: "Dec 10", fullDate: "Dec 10, 2026", isoDate: "2026-12-10", inflow: 0, outflow: 220000 },
  { date: "Dec 11", fullDate: "Dec 11, 2026", isoDate: "2026-12-11", inflow: 0, outflow: 120000 },
  { date: "Dec 12", fullDate: "Dec 12, 2026", isoDate: "2026-12-12", inflow: 0, outflow: 85000 },
  { date: "Dec 13", fullDate: "Dec 13, 2026", isoDate: "2026-12-13", inflow: 240000, outflow: 95000 },
];

export default function DashboardPage() {
  // Zone A: Unified 4-Column KPI Header Strip State
  const [liveCash, setLiveCash] = React.useState(6420500);
  const [settledThisWeek, setSettledThisWeek] = React.useState(480000);
  const [velocityAmount] = React.useState(1850000);
  const [unpaidReceivables, setUnpaidReceivables] = React.useState(2940000);
  const [openInvoicesCount, setOpenInvoicesCount] = React.useState(11);
  const [overdueCount, setOverdueCount] = React.useState(3);
  const [overdueExposure, setOverdueExposure] = React.useState(615000);
  const [isCashFlashing, setIsCashFlashing] = React.useState(false);

  // Zone C: Actionable Receivables State
  const [invoices, setInvoices] = React.useState<ActionableInvoice[]>(INITIAL_INVOICES);

  // Zone B: "What-If" Simulation Strip State
  const [simType, setSimType] = React.useState<"inflow" | "outflow">("outflow");
  const [simAmount, setSimAmount] = React.useState<string>("");
  const [simDate, setSimDate] = React.useState<string>("2026-11-27");
  const [activeSim, setActiveSim] = React.useState<{
    type: "inflow" | "outflow";
    amount: number;
    isoDate: string;
  } | null>(null);

  // Interactive Chart Tooltip State
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  // One-Click Settlement Handler
  const handleMarkPaid = (invoiceId: string) => {
    const target = invoices.find((inv) => inv.id === invoiceId);
    if (!target || target.status === "PAID") return;

    // Flash Live Cash Position figure to Botanical Emerald (#0F3D2E)
    setIsCashFlashing(true);
    setTimeout(() => {
      setIsCashFlashing(false);
    }, 1200);

    // Update KPI numbers in state
    setLiveCash((prev) => prev + target.amount);
    setSettledThisWeek((prev) => prev + target.amount);
    setUnpaidReceivables((prev) => Math.max(0, prev - target.amount));
    setOpenInvoicesCount((prev) => Math.max(0, prev - 1));

    if (target.isOverdue) {
      setOverdueCount((prev) => Math.max(0, prev - 1));
      setOverdueExposure((prev) => Math.max(0, prev - target.amount));
    }

    // Mark invoice paid in table list
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: "PAID",
              dueText: "Settled today",
              isOverdue: false,
            }
          : inv
      )
    );
  };

  // Simulation Form Submit
  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = simAmount ? parseFloat(simAmount) : 5600000;
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setActiveSim({
      type: simType,
      amount: parsedAmount,
      isoDate: simDate,
    });
  };

  // Reset Simulation
  const handleResetSim = () => {
    setActiveSim(null);
    setSimAmount("");
  };

  // Compute 30-Day Rolling Cash Flow Forecast Waterfall
  const forecastDays: ForecastDay[] = React.useMemo(() => {
    let runningBalance = liveCash;
    const days: ForecastDay[] = [];

    for (let i = 0; i < BASE_FORECAST_DAYS.length; i++) {
      const base = BASE_FORECAST_DAYS[i];
      let dayInflow = base.inflow;
      let dayOutflow = base.outflow;

      if (activeSim && activeSim.isoDate === base.isoDate) {
        if (activeSim.type === "inflow") {
          dayInflow += activeSim.amount;
        } else {
          dayOutflow += activeSim.amount;
        }
      }

      runningBalance = runningBalance + dayInflow - dayOutflow;

      days.push({
        dayNumber: i + 1,
        date: base.date,
        fullDate: base.fullDate,
        isoDate: base.isoDate,
        inflow: dayInflow,
        outflow: dayOutflow,
        baseClosing: runningBalance,
      });
    }

    return days;
  }, [liveCash, activeSim]);

  // Dynamic Safety Floor Check (PKR 1,500,000)
  const safetyFloor = 1500000;
  let lowestBalance = forecastDays[0]?.baseClosing ?? liveCash;
  let gapDate = forecastDays[0]?.date ?? "Nov 14";

  for (const day of forecastDays) {
    if (day.baseClosing < lowestBalance) {
      lowestBalance = day.baseClosing;
      gapDate = day.date;
    }
  }

  const hasCashGap = lowestBalance < safetyFloor;

  // Max scale calculation for Y-Axis
  const highestBalance = Math.max(...forecastDays.map((d) => d.baseClosing), 7500000);
  const maxY = Math.ceil(highestBalance / 1500000) * 1500000;

  // Y-axis ticks (Compact monospace labels per Section 5.7)
  const yTicks = [
    { value: maxY, label: `${(maxY / 1000000).toFixed(1)}M` },
    { value: maxY * 0.8, label: `${((maxY * 0.8) / 1000000).toFixed(1)}M` },
    { value: maxY * 0.6, label: `${((maxY * 0.6) / 1000000).toFixed(1)}M` },
    { value: maxY * 0.4, label: `${((maxY * 0.4) / 1000000).toFixed(1)}M` },
    { value: maxY * 0.2, label: `${((maxY * 0.2) / 1000000).toFixed(1)}M` },
    { value: 0, label: "0" },
  ];

  // Bar Color Decision per Design Specification Section 5.7
  const getBarColor = (day: ForecastDay): string => {
    if (day.baseClosing < safetyFloor) {
      return "#B91C1C"; // Crimson (Cash-gap deficit day)
    }
    if (day.inflow >= 300000 && day.inflow > day.outflow * 1.5) {
      return "#0F3D2E"; // Botanical Emerald (Expected inflow spike)
    }
    if (day.outflow >= 400000 && day.inflow < 150000) {
      return "#A1A1AA"; // Muted Zinc (Scheduled outflow dip)
    }
    return "#18181B"; // Obsidian (Net positive position)
  };

  const hoveredDay = hoveredIndex !== null ? forecastDays[hoveredIndex] : null;
  const hoveredBarPercent =
    hoveredIndex !== null ? ((hoveredIndex + 0.5) / forecastDays.length) * 100 : 50;

  return (
    <div className="w-full bg-white divide-y divide-zinc-200 border-b border-zinc-200">
      {/* =========================================================================
          ZONE A: Unified 4-Column KPI Header Strip
          Hairline grid borders, zero card soup, tabular figures
      ========================================================================= */}
      <section
        aria-label="Key Performance Indicators"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 border-b border-zinc-200 bg-white divide-y sm:divide-y-0 sm:divide-x divide-zinc-200"
      >
        {/* Cell 1: LIVE CASH POSITION */}
        <div className="px-6 lg:px-8 py-6">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500 select-none">
            LIVE CASH POSITION
          </div>
          <div
            className={`text-[30px] font-semibold tracking-tight tabular-nums mt-2 transition-colors duration-300 ${
              isCashFlashing ? "text-[#0F3D2E]" : "text-gray-900"
            }`}
          >
            PKR {liveCash.toLocaleString()}
          </div>
          <div className="text-xs text-emerald-700 tabular-nums mt-1.5 font-normal">
            +PKR {settledThisWeek.toLocaleString()} settled this week
          </div>
        </div>

        {/* Cell 2: 30D CASH VELOCITY */}
        <div className="px-6 lg:px-8 py-6">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500 select-none">
            30D CASH VELOCITY
          </div>
          <div className="text-[30px] font-semibold tracking-tight tabular-nums text-gray-900 mt-2">
            +PKR {velocityAmount.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-500 tabular-nums mt-1.5 font-normal">
            Inflow 3.20M · Outflow 1.35M
          </div>
        </div>

        {/* Cell 3: UNPAID RECEIVABLES */}
        <div className="px-6 lg:px-8 py-6">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500 select-none">
            UNPAID RECEIVABLES
          </div>
          <div className="text-[30px] font-semibold tracking-tight tabular-nums text-gray-900 mt-2">
            PKR {unpaidReceivables.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-500 tabular-nums mt-1.5 font-normal">
            Across {openInvoicesCount} open invoices
          </div>
        </div>

        {/* Cell 4: OVERDUE EXPOSURE */}
        <div className="px-6 lg:px-8 py-6">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500 select-none">
            OVERDUE EXPOSURE
          </div>
          <div
            className={`text-[30px] font-semibold tracking-tight tabular-nums mt-2 ${
              overdueCount > 0 ? "text-red-700 font-semibold" : "text-gray-900 font-semibold"
            }`}
          >
            {overdueCount} {overdueCount === 1 ? "Invoice" : "Invoices"}
          </div>
          <div
            className={`text-xs tabular-nums mt-1.5 font-normal ${
              overdueCount > 0 ? "text-red-700/80" : "text-zinc-500"
            }`}
          >
            PKR {overdueExposure.toLocaleString()} past due date
          </div>
        </div>
      </section>

      {/* =========================================================================
          ZONE B: 30-Day Rolling Cash Flow Forecast Waterfall
          Architectural header, What-If simulation bar, and 30-day forecast canvas
      ========================================================================= */}
      <section
        aria-label="30-Day Cash Flow Forecast"
        className="p-6 lg:p-8 border-b border-zinc-200 bg-white"
      >
        {/* Header & Inline "What-If" Simulation Strip */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 tracking-tight">
              30-Day Rolling Cash Position Forecast
            </h2>
            {hasCashGap ? (
              <p className="text-xs text-red-700 font-medium mt-0.5 tabular-nums">
                Cash-Gap Warning: Balance dips to PKR {lowestBalance.toLocaleString()} on {gapDate}
              </p>
            ) : (
              <p className="text-xs text-emerald-700 mt-0.5 tabular-nums font-normal">
                No cash gaps projected above PKR 1,500,000 safety floor
              </p>
            )}
          </div>

          {/* "What-If" Simulation Strip */}
          <form
            onSubmit={handleSimulate}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500 mr-1 select-none">
              What-If:
            </span>
            <select
              value={simType}
              onChange={(e) => setSimType(e.target.value as "inflow" | "outflow")}
              className="h-8 text-xs border border-zinc-300 rounded-md bg-white px-2 text-gray-900 focus:outline-none focus:border-zinc-900 cursor-pointer"
              aria-label="Simulation flow type"
            >
              <option value="inflow">Inflow (+)</option>
              <option value="outflow">Outflow (-)</option>
            </select>
            <input
              type="number"
              placeholder="Amount"
              value={simAmount}
              onChange={(e) => setSimAmount(e.target.value)}
              className="h-8 w-32 text-xs tabular-nums border border-zinc-300 rounded-md px-2.5 text-gray-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900"
              aria-label="Simulation amount"
            />
            <input
              type="date"
              value={simDate}
              onChange={(e) => setSimDate(e.target.value)}
              className="h-8 text-xs tabular-nums border border-zinc-300 rounded-md px-2 text-gray-900 focus:outline-none focus:border-zinc-900"
              aria-label="Simulation date"
            />
            <button
              type="submit"
              className="h-8 px-3 text-xs rounded-md border border-zinc-300 bg-white text-gray-900 hover:border-zinc-900 font-medium transition-colors cursor-pointer"
            >
              Simulate
            </button>
            {activeSim !== null && (
              <button
                type="button"
                onClick={handleResetSim}
                className="h-8 px-2 text-xs text-zinc-500 hover:text-gray-900 font-medium transition-colors underline-offset-4 hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </form>
        </div>

        {/* 30-Day Forecast Chart Canvas (h-[320px] w-full relative) */}
        <div
          className="h-[320px] w-full relative select-none flex flex-col justify-between"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Main Chart Grid: Y-Axis Column + Bars Canvas */}
          <div className="flex-1 w-full flex items-stretch min-h-0 relative">
            {/* Y-Axis Column (JetBrains Mono 11px, #71717A) */}
            <div className="w-12 h-full flex flex-col justify-between text-right pr-2.5 pb-1 font-mono text-[11px] text-[#71717A] tabular-nums shrink-0 select-none">
              {yTicks.map((tick, idx) => (
                <span key={`y-label-${idx}`} className="leading-none">
                  {tick.label}
                </span>
              ))}
            </div>

            {/* Bars Area with Horizontal Dashed Lines */}
            <div className="flex-1 h-full relative border-b border-zinc-300">
              {/* Horizontal Dashed Lines Only (No Vertical Gridlines) */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {yTicks.slice(0, 5).map((_, idx) => (
                  <div
                    key={`gridline-${idx}`}
                    className="w-full border-b border-dashed border-[#E4E4E7]"
                  />
                ))}
              </div>

              {/* 30 Daily Forecast Bars */}
              <div className="absolute inset-0 flex items-end justify-between gap-[2px] sm:gap-1 px-1">
                {forecastDays.map((day, idx) => {
                  const heightPercent = Math.min(100, Math.max(3, (day.baseClosing / maxY) * 100));
                  const barColor = getBarColor(day);
                  const isHovered = hoveredIndex === idx;

                  return (
                    <div
                      key={`slot-${day.isoDate}`}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onTouchStart={() => setHoveredIndex(idx)}
                      className="flex-1 h-full flex items-end justify-center group relative cursor-pointer"
                    >
                      <div
                        style={{
                          height: `${heightPercent}%`,
                          backgroundColor: barColor,
                        }}
                        className={`w-full max-w-[18px] rounded-t-[2px] transition-all duration-150 ${
                          isHovered ? "opacity-100 ring-1 ring-zinc-900/30" : "opacity-90"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Interactive Tooltip Displaying Date + Inflow, Outflow, Projected Closing */}
              {hoveredDay && (
                <div
                  className="absolute bg-white border border-zinc-200 rounded-md p-3 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.08)] pointer-events-none z-20 min-w-[210px] transition-all duration-150"
                  style={{
                    left: `${Math.min(Math.max(hoveredBarPercent, 14), 86)}%`,
                    top: "8px",
                    transform:
                      hoveredBarPercent > 65
                        ? "translateX(-90%)"
                        : hoveredBarPercent < 35
                        ? "translateX(-10%)"
                        : "translateX(-50%)",
                  }}
                >
                  <div className="text-xs font-semibold text-gray-900 border-b border-zinc-100 pb-1.5 mb-2 flex items-center justify-between">
                    <span>{hoveredDay.fullDate}</span>
                    <span className="font-mono text-[10px] text-zinc-400">
                      Day {hoveredDay.dayNumber}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-zinc-500">Inflow:</span>
                      <span className="font-mono tabular-nums text-emerald-700 font-medium">
                        {hoveredDay.inflow > 0 ? `+PKR ${hoveredDay.inflow.toLocaleString()}` : "PKR 0"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-zinc-500">Outflow:</span>
                      <span className="font-mono tabular-nums text-zinc-700 font-medium">
                        {hoveredDay.outflow > 0 ? `-PKR ${hoveredDay.outflow.toLocaleString()}` : "PKR 0"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-zinc-100">
                      <span className="text-zinc-600 font-medium">Projected Closing:</span>
                      <span
                        className={`font-mono tabular-nums font-semibold ${
                          hoveredDay.baseClosing < safetyFloor ? "text-red-700" : "text-gray-900"
                        }`}
                      >
                        PKR {hoveredDay.baseClosing.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* X-Axis Monospace Ticks (Every 3rd day per Section 5.7) */}
          <div className="h-6 flex items-center pl-12 pr-1 font-mono text-[11px] text-[#71717A] select-none pt-1">
            {forecastDays.map((day, idx) => {
              const isTickDay = idx % 3 === 0 || idx === forecastDays.length - 1;
              return (
                <div key={`tick-${idx}`} className="flex-1 text-center">
                  {isTickDay && (
                    <span className="truncate block text-[10px] sm:text-[11px]">
                      {day.date}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-zinc-100 flex flex-wrap items-center gap-6 text-xs text-zinc-500">
          <div className="inline-flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#18181B]" />
            <span>Net Positive Position</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#0F3D2E]" />
            <span>Inflow Spike</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#A1A1AA]" />
            <span>Scheduled Outflow Dip</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#B91C1C]" />
            <span>Cash-Gap Deficit (&lt; PKR 1.5M Floor)</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ZONE C: Lower Asymmetric Operational Split
          Left (8 cols): Actionable Receivables with one-click settlement
          Right (4 cols): Scheduled Reminders timeline + FX Treasury Rates
      ========================================================================= */}
      <section
        aria-label="Operational Treasury Ledger"
        className="grid grid-cols-1 xl:grid-cols-12 bg-white"
      >
        {/* Left Column: Actionable Receivables (xl:col-span-8) */}
        <div className="xl:col-span-8 p-6 lg:p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500 select-none">
              ACTIONABLE RECEIVABLES
            </h3>
            <Link
              href="/invoices"
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-gray-900 underline-offset-4 hover:underline transition-colors"
            >
              <span>View All Invoices</span>
              <span>→</span>
            </Link>
          </div>

          {/* Receivables List */}
          <div className="divide-y divide-zinc-200 border-t border-zinc-200">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-[#FAFAFA] px-2 -mx-2 transition-colors"
              >
                {/* Left: ID + Client Name + Status Dot */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-zinc-600 shrink-0">
                    {inv.id}
                  </span>
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {inv.client}
                  </span>

                  {/* 6px Status Dot per Section 5.3 */}
                  {inv.status === "PAID" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-900 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                      Paid
                    </span>
                  )}
                  {inv.status === "SENT" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      Sent
                    </span>
                  )}
                  {inv.status === "OVERDUE" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-700" />
                      Overdue
                    </span>
                  )}
                </div>

                {/* Center: Due Countdown */}
                <div className="hidden sm:block text-xs tabular-nums text-right shrink-0">
                  {inv.status === "PAID" ? (
                    <span className="text-emerald-700 font-medium">Settled</span>
                  ) : inv.isOverdue ? (
                    <span className="text-red-700 font-medium">{inv.dueText}</span>
                  ) : (
                    <span className="text-zinc-500">{inv.dueText}</span>
                  )}
                </div>

                {/* Right: Tabular Amount + One-Click Settlement Button */}
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm font-medium tabular-nums text-gray-900">
                    PKR {inv.amount.toLocaleString()}
                  </span>
                  {inv.status === "PAID" ? (
                    <span className="h-7 px-2.5 rounded-md bg-[#FAFAFA] border border-zinc-200 text-[11px] font-medium text-zinc-400 select-none inline-flex items-center justify-center">
                      Settled
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleMarkPaid(inv.id)}
                      className="h-7 px-2.5 rounded-md bg-white border border-zinc-200 text-[11px] font-medium text-zinc-700 hover:border-zinc-900 hover:text-gray-900 transition-colors inline-flex items-center justify-center cursor-pointer"
                    >
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Scheduled Reminders & FX Treasury Rates (xl:col-span-4) */}
        <div className="xl:col-span-4 bg-[#FAFAFA] border-t xl:border-t-0 xl:border-l border-zinc-200 p-6 lg:p-8 flex flex-col justify-between">
          {/* Top Block: Scheduled Reminders Timeline */}
          <div>
            <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-4 select-none">
              SCHEDULED REMINDERS
            </h3>
            <div className="space-y-4">
              <div className="border-l-2 border-zinc-300 pl-3.5 py-1 space-y-1">
                <div className="font-mono text-[11px] text-zinc-500 tabular-nums">
                  Tomorrow, 09:00 AM
                </div>
                <div className="text-xs text-gray-900 font-medium">
                  Gentle due-date reminder · Zainab Textiles (INV-089)
                </div>
              </div>

              <div className="border-l-2 border-zinc-300 pl-3.5 py-1 space-y-1">
                <div className="font-mono text-[11px] text-zinc-500 tabular-nums">
                  Nov 18, 10:30 AM
                </div>
                <div className="text-xs text-gray-900 font-medium">
                  First overdue notice · Crescent Garments (INV-088)
                </div>
              </div>

              <div className="border-l-2 border-zinc-300 pl-3.5 py-1 space-y-1">
                <div className="font-mono text-[11px] text-zinc-500 tabular-nums">
                  Nov 21, 02:00 PM
                </div>
                <div className="text-xs text-gray-900 font-medium">
                  Follow-up escalation · Lahore Cotton Mills (INV-086)
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Block: FX Treasury Rates */}
          <div className="pt-6 border-t border-zinc-200 mt-8">
            <div className="flex items-center justify-between mb-3 select-none">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                FX TREASURY RATES
              </h3>
              <span className="font-mono text-[10px] text-zinc-400">SBP Interbank</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-200/60 text-xs">
                <span className="font-medium text-gray-900">USD / PKR</span>
                <span className="font-mono text-xs tabular-nums text-zinc-700">278.50</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-200/60 text-xs">
                <span className="font-medium text-gray-900">EUR / PKR</span>
                <span className="font-mono text-xs tabular-nums text-zinc-700">301.20</span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-xs">
                <span className="font-medium text-gray-900">GBP / PKR</span>
                <span className="font-mono text-xs tabular-nums text-zinc-700">354.80</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
