import * as React from "react";
import Link from "next/link";
import { FinFlowMark } from "@/components/shell/TopNav";
import { PositionStrip } from "@/components/data/PositionStrip";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between selection:bg-foam">
      {/* 1. Header & Navigation (72px, canvas background) */}
      <header className="h-[72px] border-b border-line bg-canvas sticky top-0 z-20">
        <div className="max-w-[1360px] mx-auto px-6 lg:px-10 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 font-sans font-medium text-[20px] tracking-[-0.02em] text-ink select-none"
            >
              <span>finflow</span>
              <FinFlowMark />
            </Link>
            <span className="hidden sm:inline-block text-[12px] font-medium text-ink-3 bg-sunken px-2.5 py-0.5 rounded-[6px] border border-line">
              CS2682 Final Project
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-[14px] font-medium text-ink-2 hover:text-ink transition-colors select-none"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="h-10 px-4 rounded-[10px] bg-ink text-white text-[14px] font-medium hover:bg-ink-hover transition-colors inline-flex items-center justify-center select-none"
            >
              Create workspace
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Body */}
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-6 lg:px-10 py-16">
        {/* Hero Section */}
        <section className="max-w-4xl pt-6 pb-16">
          <div className="inline-flex items-center px-3 py-1 rounded-[6px] bg-foam text-[13px] font-medium text-lagoon-ink mb-6 select-none">
            30-day liquidity intelligence
          </div>

          <h1 className="text-[44px] sm:text-[68px] lg:text-[84px] font-light tracking-[-0.035em] leading-[0.98] text-ink mb-8">
            Know your cash thirty days early.
          </h1>

          <p className="text-[18px] sm:text-[22px] leading-[32px] text-ink-2 font-normal max-w-2xl mb-10">
            Accounting tools record what already happened. FinFlow models your next thirty days of liquidity, client payment delays, and impending cash gaps before payroll or bills come due.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/register"
              className="h-12 px-6 rounded-[10px] bg-ink text-white text-[15px] font-medium hover:bg-ink-hover transition-colors inline-flex items-center justify-center select-none"
            >
              Create workspace
            </Link>
            <Link
              href="/login"
              className="h-12 px-6 rounded-[10px] bg-transparent text-ink border border-line-strong hover:bg-sunken transition-colors inline-flex items-center justify-center text-[15px] font-medium select-none"
            >
              Sign in to workspace
            </Link>
          </div>
        </section>

        {/* 3. The Tideline Live Forecast Simulation (Unboxed + Porcelain Sheet) */}
        <section className="mb-24">
          <div className="border border-line rounded-[20px] bg-sheet p-8 lg:p-10 shadow-float">
            {/* Sheet Header */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between pb-6 mb-8 border-b border-line gap-2">
              <div>
                <div className="text-[16px] font-medium text-ink">
                  Rehman and Sons Trading
                </div>
                <div className="text-[13px] text-ink-3">
                  Base currency: PKR • 30-day forward liquidity model
                </div>
              </div>
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-[6px] bg-foam text-lagoon-ink text-[13px] font-medium">
                  Runway: 42 days safe
                </span>
              </div>
            </div>

            {/* Position Strip on Sheet */}
            <PositionStrip
              data={{
                liquidCash: 4380250,
                asOf: "13 Nov 2026",
                receivables30d: 2222750,
                receivablesCount: 5,
                overdue: 618300,
                overdueCount: 4,
                cashGapDate: undefined,
                cashGapStatus: "Above safety buffer",
                currency: "PKR",
              }}
              className="mb-8"
            />

            {/* Simulated Tideline Curve Vector */}
            <div className="border border-line rounded-[10px] p-6 bg-canvas">
              <div className="flex items-center justify-between text-[13px] text-ink-3 mb-4">
                <span className="font-medium text-ink">30-day cash curve</span>
                <span>Waterline buffer: PKR 1,200,000</span>
              </div>
              <div className="w-full h-32 relative">
                <svg
                  viewBox="0 0 900 120"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full"
                  preserveAspectRatio="none"
                >
                  {/* Waterline buffer (dashed line) */}
                  <line
                    x1="0"
                    y1="90"
                    x2="900"
                    y2="90"
                    stroke="var(--ebb)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  {/* Area fill */}
                  <path
                    d="M0 45 C150 45 220 20 380 20 C520 20 580 75 720 75 C800 75 850 35 900 30 L900 120 L0 120 Z"
                    fill="var(--foam)"
                    opacity="0.6"
                  />
                  {/* Tideline Curve */}
                  <path
                    d="M0 45 C150 45 220 20 380 20 C520 20 580 75 720 75 C800 75 850 35 900 30"
                    stroke="var(--lagoon)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Day Ruler Ticks */}
              <div className="flex justify-between items-center pt-3 border-t border-line text-[12px] text-ink-3">
                <span className="font-semibold text-ink">Today</span>
                <span>Day 7</span>
                <span>Day 14</span>
                <span>Day 21</span>
                <span>Day 30</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Three Scenes */}
        <section className="mb-24 pt-8 border-t border-line">
          <div className="mb-12">
            <h2 className="text-[32px] sm:text-[40px] font-light tracking-[-0.03em] text-ink">
              Three behaviors that protect your cash.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border border-line rounded-[20px] bg-sheet p-8">
              <span className="text-[12px] font-medium text-ink-3 block mb-2">Scene 1</span>
              <h3 className="text-[20px] font-medium text-ink mb-3 tracking-[-0.01em]">
                Every invoice is a date.
              </h3>
              <p className="text-[14px] leading-[22px] text-ink-2">
                An unpaid invoice is not revenue; it is an expected settlement date. FinFlow projects the precise day each client will pay based on payment terms and aging.
              </p>
            </div>

            <div className="border border-line rounded-[20px] bg-sheet p-8">
              <span className="text-[12px] font-medium text-ink-3 block mb-2">Scene 2</span>
              <h3 className="text-[20px] font-medium text-ink mb-3 tracking-[-0.01em]">
                Late payers, priced in.
              </h3>
              <p className="text-[14px] leading-[22px] text-ink-2">
                Clients that routinely settle 14 days late are dynamically offset in your forecast, preventing premature payroll and supplier commitments.
              </p>
            </div>

            <div className="border border-line rounded-[20px] bg-sheet p-8">
              <span className="text-[12px] font-medium text-ink-3 block mb-2">Scene 3</span>
              <h3 className="text-[20px] font-medium text-ink mb-3 tracking-[-0.01em]">
                One number, any currency.
              </h3>
              <p className="text-[14px] leading-[22px] text-ink-2">
                Invoice in USD, EUR, GBP, AED, or SAR with precise spot rates, while your liquid cockpit always displays true domestic operating reserve.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Academic Verification Card */}
        <section className="mb-24 pt-8 border-t border-line">
          <div className="border border-line rounded-[20px] bg-sheet p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-[16px] font-medium text-ink mb-3">
                  Academic Project Verification
                </h3>
                <div className="space-y-1.5 text-[14px] text-ink-2">
                  <div>
                    <span className="text-ink-3">Course:</span> CS2682 Web Application Development
                  </div>
                  <div>
                    <span className="text-ink-3">Institution:</span> Riphah International University
                  </div>
                  <div>
                    <span className="text-ink-3">Student Name:</span> Ahmad Aamir
                  </div>
                  <div>
                    <span className="text-ink-3">Registration ID:</span> AF25LHB4554
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[16px] font-medium text-ink mb-3">
                  Architecture & Invariants
                </h3>
                <div className="space-y-1.5 text-[14px] text-ink-2">
                  <div>
                    <span className="text-ink-3">Platform:</span> Next.js 16 (Turbopack + App Router)
                  </div>
                  <div>
                    <span className="text-ink-3">Database:</span> PostgreSQL on Neon (Direct & Pooled)
                  </div>
                  <div>
                    <span className="text-ink-3">Isolation:</span> 3NF multi-tenant schema with company foreign keys
                  </div>
                  <div>
                    <span className="text-ink-3">Precision:</span> Decimal arithmetic (no floating point drift)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Close Section */}
        <section className="py-16 text-left">
          <h2 className="text-[44px] sm:text-[64px] font-light tracking-[-0.035em] text-ink leading-tight mb-6">
            Know the day.
          </h2>
          <div className="flex items-center gap-4">
            <Link
              href="/register"
              className="h-12 px-6 rounded-[10px] bg-ink text-white text-[15px] font-medium hover:bg-ink-hover transition-colors inline-flex items-center justify-center select-none"
            >
              Create workspace
            </Link>
            <Link
              href="/login"
              className="text-[15px] font-medium text-ink underline underline-offset-4 decoration-line-strong hover:decoration-lagoon select-none"
            >
              Sign in
            </Link>
          </div>
        </section>
      </main>

      {/* 7. Footer */}
      <footer className="border-t border-line bg-canvas py-8">
        <div className="max-w-[1360px] mx-auto px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between text-[13px] text-ink-3 gap-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">finflow</span>
            <FinFlowMark />
            <span className="ml-2">Built for CS2682, Riphah International University</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-ink transition-colors">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-ink transition-colors">
              Create workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
