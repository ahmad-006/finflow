"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Check, ArrowRight, ShieldCheck, Layers, Globe2, TrendingUp, Calendar, RefreshCw } from "lucide-react";
import { TopNav } from "@/components/shell/TopNav";

export default function HomePage() {
  // Scenario toggles for Right Interactive Sandbox
  const [settleInv, setSettleInv] = React.useState<boolean>(false);
  const [delayApex, setDelayApex] = React.useState<boolean>(false);
  const [displayUsd, setDisplayUsd] = React.useState<boolean>(false);

  // Active feature index for Band 3 Architectural Showcase
  const [activeFeature, setActiveFeature] = React.useState<number>(0);

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  // FX Conversion constant: 1 USD = 278.50 PKR
  const FX_USD_PKR = 278.5;

  // Calculate dynamic cash position
  // Default: PKR 4,850,000
  // Settle INV-084: +PKR 1,200,000
  // Delay Apex: -PKR 1,200,000 (net deficit trigger)
  let pkrAmount = 4850000;
  if (settleInv) pkrAmount += 1200000;
  if (delayApex) pkrAmount -= 1200000;

  // Format tabular readout figure
  let displayFigure = "";
  if (displayUsd) {
    const usdAmount = Math.round(pkrAmount / FX_USD_PKR);
    displayFigure = `$${usdAmount.toLocaleString("en-US")}`;
  } else {
    displayFigure = `PKR ${pkrAmount.toLocaleString("en-US")}`;
  }

  // 30-Day simulated trajectory data points for the SVG chart
  const chartPoints = React.useMemo(() => {
    const points: Array<{
      day: number;
      date: string;
      balance: number;
      type: "normal" | "inflow" | "outflow" | "deficit";
    }> = [];
    let current = 4850000;

    for (let day = 1; day <= 30; day++) {
      let type: "normal" | "inflow" | "outflow" | "deficit" = "normal";

      // Day 1 (Today): Early settlement toggle
      if (day === 1 && settleInv) {
        current += 1200000;
        type = "inflow";
      }

      // Day 5 (Nov 18): Regular scheduled receivable (INV-079)
      if (day === 5) {
        current += 750000;
        type = "inflow";
      }

      // Day 11 (Nov 24): Apex Logistics (INV-084: PKR 1,200,000)
      if (day === 11) {
        if (!delayApex) {
          current += 1200000;
          type = "inflow";
        }
      }

      // Day 13 (Nov 26): Scheduled vendor & payroll outflow
      if (day === 13) {
        current -= 1850000;
        type = "outflow";
      }

      // Day 20 (Dec 03): Delayed Apex arrival if delayed
      if (day === 25 && delayApex) {
        current += 1200000;
        type = "inflow";
      }

      // Day 28: Retainer inflow
      if (day === 28) {
        current += 950000;
        type = "inflow";
      }

      // Deficit condition: below PKR 1.5M safety buffer
      if (current < 1500000) {
        type = "deficit";
      }

      const dateStr = `Day ${day}`;
      points.push({ day, date: dateStr, balance: current, type });
    }

    return points;
  }, [settleInv, delayApex]);

  // Dimensions for the 30-day SVG chart
  const svgWidth = 420;
  const svgHeight = 130;
  const minBal = 800000;
  const maxBal = 7500000;

  // Scale Y balance to SVG pixel Y (inverted)
  const scaleY = (val: number) => {
    const clamped = Math.max(minBal, Math.min(maxBal, val));
    const ratio = (clamped - minBal) / (maxBal - minBal);
    return svgHeight - ratio * (svgHeight - 16) - 8;
  };

  // Safety buffer line Y coordinate (PKR 1,500,000)
  const bufferY = scaleY(1500000);

  // Features data for Band 3
  const features = [
    {
      id: "01",
      title: "30-Day Rolling Cash Waterfall",
      summary:
        "Continuous day-by-day liquidity simulation combining open receivables, verified client delays, and committed expenses.",
      category: "FORECASTING",
    },
    {
      id: "02",
      title: "Split-Screen Invoice & Live A4 PDF Studio",
      summary:
        "Side-by-side ledger drafting with instant vector A4 PDF generation, complete with NTN and multi-currency exchange lines.",
      category: "INVOICING",
    },
    {
      id: "03",
      title: "Automated Payment Reminder Cadence",
      summary:
        "Scheduled, respectful payment notifications dispatched at T-3 days, on due dates, and structured escalation intervals.",
      category: "COLLECTIONS",
    },
    {
      id: "04",
      title: "Client Payment Reliability Dossier",
      summary:
        "Empirical debtor intelligence analyzing historical payment latency, terms compliance, and exposure concentration.",
      category: "INTELLIGENCE",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-zinc-900 selection:text-white">
      {/* Top Navigation */}
      <TopNav />

      <main className="max-w-[1360px] mx-auto border-x border-zinc-200 bg-white">
        {/* ================================================================= */}
        {/* BAND 1: Asymmetric Editorial Hero                                */}
        {/* ================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 border-b border-zinc-200">
          {/* Left Editorial Column */}
          <div className="lg:col-span-7 p-8 md:p-14 lg:p-16 flex flex-col justify-between">
            <div>
              {/* Eyebrow */}
              <div className="font-mono text-[11px] tracking-[0.12em] text-[#0F3D2E] uppercase font-medium">
                ACCOUNTS RECEIVABLE & CASH FLOW INTELLIGENCE
              </div>

              {/* Serif Headline */}
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[62px] leading-[1.04] tracking-tight text-gray-900 mt-5">
                &ldquo;Revenue on paper will not pay next month&apos;s payroll.&rdquo;
              </h1>

              {/* Body */}
              <p className="text-base text-zinc-600 max-w-lg mt-6 leading-relaxed">
                FinFlow connects unpaid invoices, multi-currency receivables, and client payment
                delays into a live 30-day cash runway—alerting you before a cash shortfall hits.
              </p>

              {/* Action Buttons */}
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-zinc-900 text-white text-sm font-medium tracking-tight hover:bg-zinc-800 active:bg-zinc-950 transition-colors"
                >
                  Open Live Treasury
                </Link>
                <Link
                  href="#thesis-strip"
                  className="inline-flex items-center justify-center h-11 px-4 text-sm font-medium text-zinc-600 hover:text-gray-900 transition-colors"
                >
                  Inspect Sample Ledger ↓
                </Link>
              </div>
            </div>

            {/* Bottom Trust Footnote */}
            <div className="mt-14 pt-6 border-t border-zinc-200 flex flex-wrap items-center gap-6 sm:gap-8 text-xs text-zinc-500 tabular-nums">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                30-Day Rolling Waterfall Forecast
              </span>
              <span className="text-zinc-300">·</span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                Live Multi-Currency FX
              </span>
              <span className="text-zinc-300">·</span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                Instant PDF Invoicing
              </span>
            </div>
          </div>

          {/* Right Interactive Sandbox Column */}
          <div className="lg:col-span-5 bg-[#FAFAFA] border-t lg:border-t-0 lg:border-l border-zinc-200 p-8 md:p-10 flex flex-col justify-between">
            <div>
              {/* Sandbox Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
                  INTERACTIVE 30-DAY RUNWAY PREVIEW
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse" />
                  LIVE SANDBOX
                </span>
              </div>

              {/* Dynamic Simulated Cash Readout */}
              <div className="mt-5 pb-5 border-b border-zinc-200">
                <span className="font-mono text-[11px] text-zinc-500 block mb-1">
                  Simulated Cash Position
                </span>
                <div className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums text-gray-900 transition-colors duration-300">
                  {displayFigure}
                </div>

                {/* Runway Status Line */}
                <div className="mt-2 text-xs font-medium tabular-nums">
                  {delayApex && !settleInv ? (
                    <span className="text-red-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-700" />
                      Cash gap alert · -PKR 240,000 shortfall on Nov 24
                    </span>
                  ) : (
                    <span className="text-emerald-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                      Healthy runway · +PKR 1.20M net 30d
                    </span>
                  )}
                </div>
              </div>

              {/* Inline SVG 30-Day Forecast Spark/Waterfall Chart */}
              <div className="my-5 bg-white border border-zinc-200 p-4">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 mb-2">
                  <span>30-Day Cash Curve</span>
                  <span className="text-zinc-400">Safety Floor: PKR 1.50M</span>
                </div>

                <div className="w-full h-32 relative">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    {/* Safety Buffer Dashed Line */}
                    <line
                      x1="0"
                      y1={bufferY}
                      x2={svgWidth}
                      y2={bufferY}
                      stroke="#E4E4E7"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />

                    {/* Chart Bars (30 days) */}
                    {chartPoints.map((pt, i) => {
                      const barWidth = 8;
                      const gap = (svgWidth - barWidth * 30) / 29;
                      const x = i * (barWidth + gap);
                      const y = scaleY(pt.balance);
                      const h = Math.max(4, svgHeight - y);

                      let fill = "#18181B"; // Obsidian
                      if (pt.type === "inflow") fill = "#0F3D2E"; // Emerald
                      if (pt.type === "outflow") fill = "#A1A1AA"; // Zinc
                      if (pt.type === "deficit") fill = "#B91C1C"; // Crimson alert

                      return (
                        <rect
                          key={pt.day}
                          x={x}
                          y={y}
                          width={barWidth}
                          height={h}
                          fill={fill}
                          rx="1"
                          className="transition-all duration-300"
                        >
                          <title>{`${pt.date}: PKR ${(pt.balance / 1000000).toFixed(2)}M`}</title>
                        </rect>
                      );
                    })}
                  </svg>
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mt-2 pt-2 border-t border-zinc-100">
                  <span>Today (Nov 14)</span>
                  <span>Nov 24</span>
                  <span>Dec 04</span>
                  <span>Day 30</span>
                </div>
              </div>

              {/* 3 Interactive Scenario Switches */}
              <div className="divide-y divide-zinc-200 border-t border-zinc-200">
                {/* Switch 1: Early Settlement */}
                <label className="py-3 flex items-center justify-between cursor-pointer group">
                  <span className="text-xs font-medium text-zinc-700 group-hover:text-gray-900 transition-colors">
                    Settle INV-084 (PKR 1,200,000) today
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settleInv}
                    aria-label="Settle INV-084 today"
                    onClick={() => setSettleInv(!settleInv)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settleInv ? "bg-[#0F3D2E]" : "bg-zinc-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                        settleInv ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </label>

                {/* Switch 2: Delay Apex Payment */}
                <label className="py-3 flex items-center justify-between cursor-pointer group">
                  <span className="text-xs font-medium text-zinc-700 group-hover:text-gray-900 transition-colors">
                    Delay &ldquo;Apex Logistics&rdquo; payment by +14 days
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={delayApex}
                    aria-label="Delay Apex Logistics payment by 14 days"
                    onClick={() => setDelayApex(!delayApex)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      delayApex ? "bg-red-700" : "bg-zinc-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                        delayApex ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </label>

                {/* Switch 3: Currency Toggle */}
                <label className="py-3 flex items-center justify-between cursor-pointer group">
                  <span className="text-xs font-medium text-zinc-700 group-hover:text-gray-900 transition-colors">
                    Display treasury in USD ($)
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={displayUsd}
                    aria-label="Display treasury in USD"
                    onClick={() => setDisplayUsd(!displayUsd)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      displayUsd ? "bg-zinc-900" : "bg-zinc-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                        displayUsd ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* BAND 2: Three-Column Typographic Thesis Strip                    */}
        {/* ================================================================= */}
        <section
          id="thesis-strip"
          className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-200 border-b border-zinc-200 bg-white scroll-mt-16"
        >
          {/* Col 1: Cash-Gap Prediction */}
          <div className="p-8 md:p-10 flex flex-col justify-between">
            <div>
              <div className="font-mono text-[11px] text-[#0F3D2E] uppercase font-medium tracking-[0.08em]">
                01 / CASH-GAP PREDICTION
              </div>
              <h2 className="text-[15px] font-semibold text-gray-900 mt-3 mb-2">
                Predict liquidity shortfalls before commitments are locked.
              </h2>
              <p className="text-[13px] text-zinc-600 leading-relaxed">
                FinFlow models payment delays and client latency dynamically to highlight upcoming
                liquidity deficits up to 30 days ahead, preventing payroll and vendor surprises.
              </p>
            </div>
          </div>

          {/* Col 2: Multi-Currency Ledger */}
          <div className="p-8 md:p-10 flex flex-col justify-between">
            <div>
              <div className="font-mono text-[11px] text-[#0F3D2E] uppercase font-medium tracking-[0.08em]">
                02 / MULTI-CURRENCY LEDGER
              </div>
              <h2 className="text-[15px] font-semibold text-gray-900 mt-3 mb-2">
                Unified domestic treasury across foreign receivables.
              </h2>
              <p className="text-[13px] text-zinc-600 leading-relaxed">
                Bill cross-border clients in USD, EUR, GBP, or SAR while monitoring your exact domestic
                PKR operational runway with automated daily spot-rate conversions.
              </p>
            </div>
          </div>

          {/* Col 3: Automated Collections */}
          <div className="p-8 md:p-10 flex flex-col justify-between">
            <div>
              <div className="font-mono text-[11px] text-[#0F3D2E] uppercase font-medium tracking-[0.08em]">
                03 / AUTOMATED COLLECTIONS
              </div>
              <h2 className="text-[15px] font-semibold text-gray-900 mt-3 mb-2">
                Systematic, auditable payment cadence.
              </h2>
              <p className="text-[13px] text-zinc-600 leading-relaxed">
                Dispatch respectful reminders at T-3 days, on due dates, and post-due intervals
                without awkward manual chase calls, preserving client trust and predictable cash flow.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* BAND 3: Interactive Architectural Feature Showcase               */}
        {/* ================================================================= */}
        <section id="product" className="grid grid-cols-1 lg:grid-cols-12 border-b border-zinc-200 scroll-mt-16">
          {/* Left Index */}
          <div className="lg:col-span-5 divide-y divide-zinc-200 bg-white">
            {features.map((feat, idx) => {
              const isActive = activeFeature === idx;
              return (
                <div
                  key={feat.id}
                  onClick={() => setActiveFeature(idx)}
                  className={`p-7 cursor-pointer transition-colors ${
                    isActive
                      ? "bg-[#FAFAFA] border-l-[3px] border-l-[#0F3D2E] -ml-[1px]"
                      : "hover:bg-zinc-50 border-l-[3px] border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] font-semibold text-[#0F3D2E]">
                      {feat.id}
                    </span>
                    <h3 className="text-sm font-semibold text-gray-900">{feat.title}</h3>
                  </div>
                  <p className="text-xs text-zinc-600 mt-2 leading-relaxed">{feat.summary}</p>
                </div>
              );
            })}
          </div>

          {/* Right Interactive Stage */}
          <div className="lg:col-span-7 bg-[#FAFAFA] border-t lg:border-t-0 lg:border-l border-zinc-200 p-8 md:p-12 flex items-center justify-center">
            {activeFeature === 0 && (
              <div className="w-full max-w-lg bg-white border border-zinc-200 p-6">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-200 text-xs">
                  <div>
                    <span className="font-mono text-[11px] text-zinc-500 uppercase block">
                      TREASURY WATERFALL
                    </span>
                    <span className="font-semibold text-gray-900">30-Day Liquidity Trajectory</span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Runway: 38 Days Safe
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                  <div className="border border-zinc-200 p-3 bg-[#FAFAFA]">
                    <span className="text-[11px] text-zinc-500 block">Opening</span>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">PKR 4.85M</span>
                  </div>
                  <div className="border border-zinc-200 p-3 bg-[#FAFAFA]">
                    <span className="text-[11px] text-zinc-500 block">Net Inflow</span>
                    <span className="text-sm font-semibold text-emerald-700 tabular-nums">+PKR 1.20M</span>
                  </div>
                  <div className="border border-zinc-200 p-3 bg-[#FAFAFA]">
                    <span className="text-[11px] text-zinc-500 block">Projected</span>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">PKR 6.05M</span>
                  </div>
                </div>

                <div className="divide-y divide-zinc-200 border-t border-zinc-200 text-xs">
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[11px] text-zinc-500 mr-2">Nov 14</span>
                      <span className="font-medium text-gray-900">Liquid Operating Reserve</span>
                    </div>
                    <span className="font-mono tabular-nums text-gray-900">PKR 4,850,000</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[11px] text-zinc-500 mr-2">Nov 18</span>
                      <span className="font-medium text-gray-900">Apex Logistics (INV-084)</span>
                    </div>
                    <span className="font-mono tabular-nums text-emerald-700">+PKR 1,200,000</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[11px] text-zinc-500 mr-2">Nov 25</span>
                      <span className="font-medium text-gray-900">Scheduled Payroll Outflow</span>
                    </div>
                    <span className="font-mono tabular-nums text-zinc-500">-PKR 1,500,000</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[11px] text-zinc-500 mr-2">Dec 02</span>
                      <span className="font-medium text-gray-900">Beacon Tech Retainer (INV-088)</span>
                    </div>
                    <span className="font-mono tabular-nums text-emerald-700">+PKR 1,500,000</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-200 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Safety Buffer: PKR 1,500,000</span>
                  <span className="text-emerald-700 font-medium">Zero deficit days projected</span>
                </div>
              </div>
            )}

            {activeFeature === 1 && (
              <div className="w-full max-w-lg bg-white border border-zinc-200 p-6">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-200 text-xs">
                  <div>
                    <span className="font-mono text-[11px] text-zinc-500 uppercase block">
                      A4 INVOICE COMPOSER
                    </span>
                    <span className="font-semibold text-gray-900">Split-Screen Live Synchronizer</span>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-600 bg-zinc-100 px-2 py-0.5">
                    1 USD = 278.50 PKR
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div className="p-3 bg-[#FAFAFA] border border-zinc-200">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase block">Client</span>
                    <span className="font-medium text-gray-900 block mt-0.5">Apex Logistics FZE</span>
                    <span className="text-[11px] text-zinc-500">Dubai, UAE</span>
                  </div>
                  <div className="p-3 bg-[#FAFAFA] border border-zinc-200">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase block">Terms</span>
                    <span className="font-medium text-gray-900 block mt-0.5">Net 15 Days</span>
                    <span className="text-[11px] text-zinc-500">Due Nov 24, 2026</span>
                  </div>
                </div>

                <div className="border border-zinc-200 p-4 bg-white mb-4">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-200 font-mono text-zinc-500">
                    <span>DESCRIPTION</span>
                    <span>TOTAL</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between text-xs">
                    <span className="text-gray-900 font-medium">Q4 Dedicated Logistics API Engine</span>
                    <span className="font-mono tabular-nums text-gray-900">$3,400.00</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-200 flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Converted Spot Runway:</span>
                    <span className="font-mono tabular-nums text-zinc-700">≈ PKR 946,900</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Live PDF vector export ready</span>
                  <span className="text-gray-900 font-medium">Instant A4 Rendering</span>
                </div>
              </div>
            )}

            {activeFeature === 2 && (
              <div className="w-full max-w-lg bg-white border border-zinc-200 p-6">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-200 text-xs">
                  <div>
                    <span className="font-mono text-[11px] text-zinc-500 uppercase block">
                      COLLECTIONS CADENCE
                    </span>
                    <span className="font-semibold text-gray-900">3-Stage Automated Notifications</span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                    Auto-Dispatch Active
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 border-l-2 border-zinc-300 bg-[#FAFAFA] text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-zinc-500">T - 3 DAYS (COURTESY)</span>
                      <span className="text-[10px] text-zinc-400">Automated</span>
                    </div>
                    <div className="text-gray-900 font-medium mt-1">Gentle Due Date Notice</div>
                    <div className="text-zinc-500 text-[11px] mt-0.5">
                      Friendly statement with bank transfer link and invoice preview PDF.
                    </div>
                  </div>

                  <div className="p-3 border-l-2 border-[#0F3D2E] bg-white border border-zinc-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-[#0F3D2E] font-semibold">
                        ON DUE DATE (ACTION)
                      </span>
                      <span className="text-[10px] text-emerald-700 font-medium">Scheduled Today</span>
                    </div>
                    <div className="text-gray-900 font-medium mt-1">Payment Reconciliation Reminder</div>
                    <div className="text-zinc-500 text-[11px] mt-0.5">
                      Direct IBAN / Raast payment instructions dispatched to finance desk.
                    </div>
                  </div>

                  <div className="p-3 border-l-2 border-red-700 bg-[#FAFAFA] text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-red-700">T + 5 DAYS (OVERDUE)</span>
                      <span className="text-[10px] text-zinc-400">Escalation</span>
                    </div>
                    <div className="text-gray-900 font-medium mt-1">Overdue Treasury Notice</div>
                    <div className="text-zinc-500 text-[11px] mt-0.5">
                      Formal account follow-up with past-due summary and ledger reconciliation link.
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-200 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Customizable timing per client</span>
                  <span className="text-gray-900 font-medium">Respectful & Auditable</span>
                </div>
              </div>
            )}

            {activeFeature === 3 && (
              <div className="w-full max-w-lg bg-white border border-zinc-200 p-6">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-200 text-xs">
                  <div>
                    <span className="font-mono text-[11px] text-zinc-500 uppercase block">
                      DEBTOR DOSSIER
                    </span>
                    <span className="font-semibold text-gray-900">Apex Logistics FZE</span>
                  </div>
                  <span className="font-mono text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 border border-amber-200">
                    Watchlist · +4d Latency
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 border border-zinc-200 divide-x divide-zinc-200 bg-[#FAFAFA] text-center mb-4">
                  <div className="p-2 sm:px-3">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase block">
                      Avg Settlement
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-gray-900">
                      34 Days
                    </span>
                  </div>
                  <div className="p-2 sm:px-3">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase block">
                      Terms Offset
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-amber-700">
                      +4 Days Late
                    </span>
                  </div>
                  <div className="p-2 sm:px-3">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase block">
                      Total Billed
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-gray-900">
                      PKR 8.45M
                    </span>
                  </div>
                  <div className="p-2 sm:px-3">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase block">
                      Open Invoices
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-gray-900">
                      PKR 1.20M
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-zinc-600">Settlement Track Record (Last 6 Invoices)</span>
                    <span className="font-mono text-[11px] text-zinc-500">10 of 12 On-Time</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1 h-3">
                    <div className="bg-emerald-700 rounded-none" title="INV-041: On-time" />
                    <div className="bg-emerald-700 rounded-none" title="INV-052: On-time" />
                    <div className="bg-amber-700 rounded-none" title="INV-063: +6d" />
                    <div className="bg-emerald-700 rounded-none" title="INV-071: On-time" />
                    <div className="bg-emerald-700 rounded-none" title="INV-079: On-time" />
                    <div className="bg-amber-700 rounded-none" title="INV-084: +4d projected" />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-1.5">
                    <span>May 2026</span>
                    <span>Nov 2026 (Projected)</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-200 text-[11px] text-zinc-500">
                  Dynamic +4 day buffer automatically applied to all pending receivables for Apex
                  Logistics.
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 4: 30-Day Rolling Forecasting Engine Deep Dive           */}
        {/* ================================================================= */}
        <section id="forecasting" className="border-b border-zinc-200 bg-white scroll-mt-16">
          <div className="p-8 md:p-14 lg:p-16 border-b border-zinc-200">
            <div className="max-w-3xl">
              <div className="font-mono text-[11px] text-[#0F3D2E] uppercase font-medium tracking-[0.12em]">
                02 / FORECASTING ENGINE MECHANICS
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-gray-900 tracking-tight mt-3">
                Liquidity foresight computed from historical client reality.
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 leading-relaxed mt-4">
                Accounting software tells you what happened last month. FinFlow projects the precise day your balance dips below your safety buffer over the next 30 days—by accounting for actual debtor latency, scheduled payroll, and spot exchange conversions.
              </p>
            </div>
          </div>

          {/* 4 Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-200 bg-white">
            <div className="p-8 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-semibold text-[#0F3D2E]">01</span>
                <h3 className="text-sm font-semibold text-gray-900 mt-2 mb-2">
                  Client Latency Index
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Contractual payment terms rarely reflect banking realities. FinFlow tracks empirical settlement histories per client, automatically buffering due dates by actual days late.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-200 font-mono text-[11px] text-zinc-500">
                Empirical latency offsetting
              </div>
            </div>

            <div className="p-8 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-semibold text-[#0F3D2E]">02</span>
                <h3 className="text-sm font-semibold text-gray-900 mt-2 mb-2">
                  Cumulative Waterfall
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  A day-by-day continuous liquidity ledger. Daily expected inflows are stacked directly against scheduled vendor payables, taxes, and committed operational overheads.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-200 font-mono text-[11px] text-zinc-500">
                30-day continuous rolling curve
              </div>
            </div>

            <div className="p-8 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-semibold text-[#0F3D2E]">03</span>
                <h3 className="text-sm font-semibold text-gray-900 mt-2 mb-2">
                  Safety Floor Deficit Alerts
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Set your business minimum operating cash floor. The moment a projected daily position breaches this threshold, FinFlow flags a crimson warning with the exact shortfall amount.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-200 font-mono text-[11px] text-zinc-500">
                Early breach alerts
              </div>
            </div>

            <div className="p-8 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-semibold text-[#0F3D2E]">04</span>
                <h3 className="text-sm font-semibold text-gray-900 mt-2 mb-2">
                  What-If Sandbox Simulation
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Test the financial impact of client delays, large capital purchases, or accelerated early settlements before making irrevocable commitments.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-200 font-mono text-[11px] text-zinc-500">
                Dynamic scenario modeling
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 5: Multi-Currency & Spot FX Consolidation                */}
        {/* ================================================================= */}
        <section id="multi-currency" className="grid grid-cols-1 lg:grid-cols-12 border-b border-zinc-200 bg-white scroll-mt-16">
          <div className="lg:col-span-6 p-8 md:p-14 lg:p-16 flex flex-col justify-between">
            <div>
              <div className="font-mono text-[11px] text-[#0F3D2E] uppercase font-medium tracking-[0.12em]">
                03 / ATOMIC MULTI-CURRENCY LEDGER
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl text-gray-900 tracking-tight mt-3">
                Bill overseas clients in USD, EUR, or GBP. Reconcile locally in PKR.
              </h2>
              <p className="text-sm text-zinc-600 leading-relaxed mt-4">
                Pakistani and cross-border SMEs frequently bill international clients in foreign currencies while paying local salaries and office expenses in domestic rupees. Currency fluctuations and delayed settlements distort cash clarity. FinFlow locks spot exchange rates at invoice issuance and computes a unified domestic liquidity trajectory.
              </p>

              <div className="grid grid-cols-3 gap-4 border-t border-zinc-200 pt-6 mt-8">
                <div>
                  <span className="font-mono text-[11px] text-zinc-400 uppercase block">Spot Rate Sync</span>
                  <span className="text-sm font-semibold text-gray-900 mt-1 block">Real-time daily</span>
                </div>
                <div>
                  <span className="font-mono text-[11px] text-zinc-400 uppercase block">Supported Base</span>
                  <span className="text-sm font-semibold text-gray-900 mt-1 block">PKR · USD · EUR · GBP</span>
                </div>
                <div>
                  <span className="font-mono text-[11px] text-zinc-400 uppercase block">FX Lock</span>
                  <span className="text-sm font-semibold text-emerald-700 mt-1 block">Zero Slippage</span>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-zinc-200 text-xs text-zinc-500">
              Foreign invoices automatically display secondary converted domestic equivalents on generated A4 PDFs.
            </div>
          </div>

          <div className="lg:col-span-6 bg-[#FAFAFA] border-t lg:border-t-0 lg:border-l border-zinc-200 p-8 md:p-12 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
                <span className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider">
                  TREASURY EXCHANGE RATES (LIVE SYNC)
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                  Live Spot Feeds
                </span>
              </div>

              {/* FX Table */}
              <div className="divide-y divide-zinc-200 mt-4 border border-zinc-200 bg-white">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-gray-900">USD / PKR</span>
                    <span className="text-[11px] text-zinc-500">US Dollar</span>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular-nums text-gray-900">278.50 PKR</span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-gray-900">EUR / PKR</span>
                    <span className="text-[11px] text-zinc-500">Euro</span>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular-nums text-gray-900">301.20 PKR</span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-gray-900">GBP / PKR</span>
                    <span className="text-[11px] text-zinc-500">British Pound</span>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular-nums text-gray-900">354.80 PKR</span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-gray-900">SAR / PKR</span>
                    <span className="text-[11px] text-zinc-500">Saudi Riyal</span>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular-nums text-gray-900">74.25 PKR</span>
                </div>
              </div>

              {/* Sample FX Invoice Conversion Card */}
              <div className="mt-6 border border-zinc-200 bg-white p-5">
                <div className="flex items-center justify-between text-xs text-zinc-500 pb-3 border-b border-zinc-200">
                  <span className="font-mono">INVOICE INV-2026-088</span>
                  <span className="text-emerald-700 font-medium">Spot Locked at Issuance</span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-semibold tabular-nums text-gray-900">$3,400.00</span>
                    <span className="text-xs text-zinc-500 ml-2">USD Billed</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm tabular-nums text-zinc-700">≈ PKR 946,900</span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">@ 278.50 PKR/USD</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 font-mono text-[11px] text-zinc-400">
              ECB Reference & Open Exchange Rates daily synchronization.
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 6: Comparative Ledger Matrix (FinFlow vs. Legacy Tools)   */}
        {/* ================================================================= */}
        <section id="comparison" className="border-b border-zinc-200 bg-white scroll-mt-16">
          <div className="p-8 md:p-14 lg:p-16 border-b border-zinc-200">
            <div className="max-w-3xl">
              <div className="font-mono text-[11px] text-[#0F3D2E] uppercase font-medium tracking-[0.12em]">
                04 / ARCHITECTURAL COMPARISON
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-gray-900 tracking-tight mt-3">
                Why traditional accounting software fails SME cash flow.
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 leading-relaxed mt-4">
                Spreadsheets are fragile and manual. Legacy accounting software is built for backward-looking accrual tax compliance. FinFlow is engineered specifically for forward-looking liquid operations.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFA] border-b border-zinc-200 select-none">
                <tr>
                  <th className="py-4 px-6 font-mono text-[11px] uppercase tracking-wider text-zinc-500 font-medium w-1/4">
                    Capability Vector
                  </th>
                  <th className="py-4 px-6 font-mono text-[11px] uppercase tracking-wider text-[#0F3D2E] font-semibold w-1/4 bg-zinc-100/50">
                    FinFlow Treasury Cockpit
                  </th>
                  <th className="py-4 px-6 font-mono text-[11px] uppercase tracking-wider text-zinc-500 font-medium w-1/4">
                    Excel Spreadsheets
                  </th>
                  <th className="py-4 px-6 font-mono text-[11px] uppercase tracking-wider text-zinc-500 font-medium w-1/4">
                    Legacy Accounting (QuickBooks/Xero)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900">
                    30-Day Rolling Cash Runway
                  </td>
                  <td className="py-4 px-6 text-gray-900 bg-zinc-100/30">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Dynamic day-by-day curve with safety buffer alert</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-zinc-500">
                    Static formula; manual data entry prone to formula breakage
                  </td>
                  <td className="py-4 px-6 text-zinc-500">
                    Backward-looking accrual P&L; blind to upcoming cash gaps
                  </td>
                </tr>

                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900">
                    Debtor Latency & Reliability Profiling
                  </td>
                  <td className="py-4 px-6 text-gray-900 bg-zinc-100/30">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Empirical payment history offsets due dates automatically</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-zinc-500">
                    None; assumes 100% on-time settlement
                  </td>
                  <td className="py-4 px-6 text-zinc-500">
                    Aged receivables report only; no forward predictive offset
                  </td>
                </tr>

                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900">
                    Multi-Currency Spot Consolidation
                  </td>
                  <td className="py-4 px-6 text-gray-900 bg-zinc-100/30">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Instant spot lock in USD/EUR/GBP reconciled into PKR</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-zinc-500">
                    Manual exchange rate lookups in Google Finance
                  </td>
                  <td className="py-4 px-6 text-zinc-500">
                    Locked behind expensive enterprise tier add-on
                  </td>
                </tr>

                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900">
                    Automated Respectful Collections
                  </td>
                  <td className="py-4 px-6 text-gray-900 bg-zinc-100/30">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Scheduled cadence at T-3, due date & overdue</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-zinc-500">
                    Manual email drafting; often forgotten until cash is tight
                  </td>
                  <td className="py-4 px-6 text-zinc-500">
                    Generic automated templates that alienate clients
                  </td>
                </tr>

                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900">
                    Live Split-Screen A4 PDF Studio
                  </td>
                  <td className="py-4 px-6 text-gray-900 bg-zinc-100/30">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Instant keystroke-mirrored vector rendering</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-zinc-500">
                    Clunky cell borders and inconsistent print margins
                  </td>
                  <td className="py-4 px-6 text-zinc-500">
                    Rigid templates requiring endless preview popups
                  </td>
                </tr>

                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900">
                    Transactional Isolation & Portability
                  </td>
                  <td className="py-4 px-6 text-gray-900 bg-zinc-100/30">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>ACID relational DB, row-level tenant isolation</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-zinc-500">
                    File corruption risk, zero concurrency, unencrypted files
                  </td>
                  <td className="py-4 px-6 text-zinc-500">
                    Proprietary SaaS lock-in with steep monthly seat fees
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 7: Security & Banking-Grade Architecture                  */}
        {/* ================================================================= */}
        <section id="security" className="border-b border-zinc-200 bg-white scroll-mt-16">
          <div className="p-8 md:p-14 lg:p-16 border-b border-zinc-200">
            <div className="max-w-3xl">
              <div className="font-mono text-[11px] text-[#0F3D2E] uppercase font-medium tracking-[0.12em]">
                05 / INFRASTRUCTURE & SECURITY
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-gray-900 tracking-tight mt-3">
                Architected for financial integrity and multi-tenant isolation.
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 leading-relaxed mt-4">
                Corporate treasury requires strict guarantees. FinFlow is built on modern relational invariants, preventing ghost entries, duplicate settlements, and tenant cross-contamination.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-200 bg-white">
            <div className="p-8 md:p-10 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-semibold text-[#0F3D2E]">SPEC 01</span>
                <h3 className="text-base font-semibold text-gray-900 mt-2 mb-3">
                  HMAC-SHA256 Cryptographic Sessions
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Sessions are cryptographically signed using Node.js crypto HMAC-SHA256 and stored in HTTP-only, SameSite=Lax, Secure cookies. Tamper-evident payloads protect against token spoofing without vulnerable client storage.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-zinc-200 font-mono text-[11px] text-zinc-500">
                Tamper-proof HTTP-only cookies
              </div>
            </div>

            <div className="p-8 md:p-10 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-semibold text-[#0F3D2E]">SPEC 02</span>
                <h3 className="text-base font-semibold text-gray-900 mt-2 mb-3">
                  ACID Relational Guarantees
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Every company creation, user registration, and invoice status change executes inside an atomic Prisma ORM transaction. Either all changes commit, or the ledger cleanly rolls back.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-zinc-200 font-mono text-[11px] text-zinc-500">
                PostgreSQL & SQLite transactional consistency
              </div>
            </div>

            <div className="p-8 md:p-10 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-semibold text-[#0F3D2E]">SPEC 03</span>
                <h3 className="text-base font-semibold text-gray-900 mt-2 mb-3">
                  Row-Level Company Isolation
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Every SQL query and mutation is strictly scoped to the authenticated tenant`s companyId. Multi-tenant database indexes guarantee zero cross-company data leakage or unauthorized receivables access.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-zinc-200 font-mono text-[11px] text-zinc-500">
                Strict multi-tenant security barrier
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 8: Frequently Asked Questions (FAQ)                      */}
        {/* ================================================================= */}
        <section id="faq" className="border-b border-zinc-200 bg-white scroll-mt-16">
          <div className="p-8 md:p-14 lg:p-16 border-b border-zinc-200">
            <div className="max-w-3xl">
              <div className="font-mono text-[11px] text-[#0F3D2E] uppercase font-medium tracking-[0.12em]">
                06 / OPERATIONAL INQUIRIES
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-gray-900 tracking-tight mt-3">
                Frequently Asked Questions
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 leading-relaxed mt-4">
                Everything you need to know about forward-looking forecasting, spot conversions, and transactional security.
              </p>
            </div>
          </div>

          <div className="divide-y divide-zinc-200 bg-white">
            {[
              {
                q: "Does FinFlow replace our chartered accountant or tax software?",
                a: "No. Traditional accounting software and chartered accountants manage historical accrual records for tax compliance and audit filings. FinFlow is a forward-looking cash cockpit designed for founders and finance leads to answer one critical daily question: 'How much actual liquid cash will we have in the bank over the next 30 days?' It complements your accountant by eliminating surprise shortfalls.",
              },
              {
                q: "How does FinFlow project when a client will actually pay?",
                a: "FinFlow records the exact timestamp invoices are issued, marked sent, and settled. Over time, it computes each client's empirical settlement latency (e.g. Apex typically pays Net 15 invoices on day 19). The 30-day runway curve uses this empirical latency offset rather than naive contractual dates to simulate true cash timing.",
              },
              {
                q: "Can I bill international clients in USD or EUR while managing a Pakistani PKR treasury?",
                a: "Yes. In the split-screen composer, you can select USD, EUR, GBP, or SAR as the invoice currency. FinFlow locks the daily spot exchange rate, displays the secondary converted PKR total, renders the dual-currency note on the live A4 PDF, and incorporates the converted domestic cash into your primary PKR runway.",
              },
              {
                q: "What happens in real time when I mark an invoice as paid?",
                a: "Clicking 'Mark Paid' executes an atomic database transaction: the invoice status switches to PAID, the settlement timestamp is committed, your Live Cash Position updates immediately, the overdue exposure drops, and the 30-day forecast recalculates in real-time.",
              },
              {
                q: "How are reminders scheduled without annoying valuable clients?",
                a: "Reminders follow a respectful 3-stage cadence: a gentle reminder 3 days before the due date, an on-date notice with payment details, and structured escalation intervals post-due date. You can also customize or pause reminders per client directly from their reliability dossier.",
              },
              {
                q: "Is our financial and bank details secure?",
                a: "All sessions are cryptographically signed using HMAC-SHA256 and stored in secure, HTTP-only cookies. Every query enforces strict multi-tenant row isolation by companyId, and all database mutations run with transactional ACID consistency.",
              },
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="divide-y divide-zinc-200">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full py-6 px-8 md:px-14 flex items-center justify-between text-left hover:bg-[#FAFAFA] transition-colors"
                  >
                    <span className="text-sm md:text-base font-semibold text-gray-900 pr-6">
                      {faq.q}
                    </span>
                    <span className="p-1 rounded-sm border border-zinc-200 text-zinc-500 shrink-0">
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-8 md:px-14 pb-6 pt-1 text-xs md:text-sm text-zinc-600 leading-relaxed bg-[#FAFAFA]/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ================================================================= */}
        {/* BAND 10: Editorial Closing Lockup & Single-Line Footer           */}
        {/* ================================================================= */}
        <section className="py-24 px-8 text-center bg-white border-b border-zinc-200">
          <h2 className="font-serif text-3xl md:text-5xl text-gray-900 tracking-tight max-w-3xl mx-auto">
            &ldquo;Every rupee and dollar accounted for—before it arrives.&rdquo;
          </h2>
          <div className="mt-7">
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-11 px-8 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              Create Workspace
            </Link>
          </div>
        </section>

        {/* Single-Line Footer */}
        <footer className="px-8 py-6 bg-[#FAFAFA] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>FinFlow Treasury Systems · Built for SME Cash Clarity</div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-gray-900 transition-colors">
              Demo Workspace
            </Link>
            <Link href="/login" className="hover:text-gray-900 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-gray-900 transition-colors">
              Create Account
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
