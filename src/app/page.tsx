import * as React from "react";
import Link from "next/link";
import { PositionStrip } from "@/components/data/PositionStrip";
import { Money } from "@/components/data/Money";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between">
      {/* 1. Header & Navigation */}
      <header className="border-b border-line bg-surface">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-serif text-[22px] font-bold text-ink">
              FinFlow
            </Link>
            <span className="text-[12px] font-medium text-ink-3 bg-sunken px-2.5 py-1 rounded-[4px] border border-line">
              CS2682 Final Project
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-[14px] font-medium text-ink-2 hover:text-ink px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-[14px] font-medium text-white bg-brand hover:bg-brand-hover px-4 py-2 rounded-[6px]"
            >
              Create workspace
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-[4px] bg-brand-tint border border-line text-[12px] font-medium text-brand mb-6">
            Cash flow intelligence for growing businesses
          </div>

          <h1 className="font-serif text-[38px] md:text-[50px] leading-[1.15] font-semibold text-ink mb-5">
            Forward-looking cash flow intelligence for modern businesses.
          </h1>

          <p className="text-[17px] leading-[26px] text-ink-2 max-w-2xl mx-auto mb-8">
            Accounting tools record what already happened. FinFlow models your next 30 days of liquidity, client payment delays, and impending cash gaps before payroll or bills come due.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center text-[14px] font-medium text-white bg-brand hover:bg-brand-hover px-5 py-2.5 rounded-[6px]"
            >
              Create workspace
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center text-[14px] font-medium text-ink-2 bg-surface hover:bg-sunken border border-line-strong px-5 py-2.5 rounded-[6px]"
            >
              Sign in to workspace
            </Link>
          </div>
        </section>

        {/* 3. Product Preview / Hero Visual */}
        <section className="max-w-5xl mx-auto px-6 mb-16">
          <div className="bg-surface border border-line rounded-[8px] p-6 shadow-pop">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-line gap-2">
              <div>
                <div className="text-[15px] font-semibold text-ink">
                  Apex Global Logistics Ltd.
                </div>
                <div className="text-[12px] text-ink-3">
                  Base currency: PKR • Multi-tenant live simulation
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] bg-positive-tint text-positive text-[12px] font-medium border border-line">
                  Runway: 42 days safe
                </span>
              </div>
            </div>

            {/* Position Strip Preview */}
            <PositionStrip
              data={{
                liquidCash: 2850000,
                asOf: "13 Nov 2026",
                receivables30d: 1420000,
                receivablesCount: 6,
                overdue: 380000,
                overdueCount: 2,
                cashGapDate: undefined,
                cashGapStatus: "Above safety buffer",
                currency: "PKR",
              }}
              className="mb-6"
            />

            {/* Forward Runway Breakdown */}
            <div className="border border-line rounded-[8px] p-4 bg-sunken">
              <div className="text-[13px] font-medium text-ink mb-3">
                Forward 30-day cash projection
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-surface border border-line rounded-[6px] p-3">
                  <span className="text-[12px] text-ink-3 block mb-1">
                    Expected inflows (30d)
                  </span>
                  <Money
                    amount={1420000}
                    currency="PKR"
                    className="text-[17px] font-semibold text-positive"
                  />
                  <span className="text-[11px] text-ink-3 block mt-1">
                    6 invoices due
                  </span>
                </div>

                <div className="bg-surface border border-line rounded-[6px] p-3">
                  <span className="text-[12px] text-ink-3 block mb-1">
                    Committed outflows (30d)
                  </span>
                  <Money
                    amount={610000}
                    currency="PKR"
                    className="text-[17px] font-semibold text-negative"
                  />
                  <span className="text-[11px] text-ink-3 block mt-1">
                    Payroll & overhead
                  </span>
                </div>

                <div className="bg-surface border border-line rounded-[6px] p-3">
                  <span className="text-[12px] text-ink-3 block mb-1">
                    Projected balance (Day 30)
                  </span>
                  <Money
                    amount={3660000}
                    currency="PKR"
                    className="text-[17px] font-semibold text-ink"
                  />
                  <span className="text-[11px] text-positive block mt-1">
                    +PKR 810,000 net change
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Three Core Architectural Pillars */}
        <section className="max-w-5xl mx-auto px-6 py-12 border-t border-line">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="font-serif text-[28px] font-semibold text-ink mb-2">
              Designed for financial clarity, not guesswork
            </h2>
            <p className="text-[14px] text-ink-2">
              Built on strict double-entry ledger principles and exact 30-day liquidity modeling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface border border-line rounded-[8px] p-5">
              <h3 className="text-[15px] font-semibold text-ink mb-2">
                Predictive 30-day liquidity
              </h3>
              <p className="text-[13px] leading-[20px] text-ink-2">
                Continuous cash runway projection that accounts for expected settlement dates, payment delay patterns, and recurring operational outflows.
              </p>
            </div>

            <div className="bg-surface border border-line rounded-[8px] p-5">
              <h3 className="text-[15px] font-semibold text-ink mb-2">
                Atomic multi-currency ledger
              </h3>
              <p className="text-[13px] leading-[20px] text-ink-2">
                Invoice in USD, EUR, GBP, AED, or SAR with precise exchange rates and automatic conversion back to your primary operating currency.
              </p>
            </div>

            <div className="bg-surface border border-line rounded-[8px] p-5">
              <h3 className="text-[15px] font-semibold text-ink mb-2">
                Proactive deficit warnings
              </h3>
              <p className="text-[13px] leading-[20px] text-ink-2">
                Calculates the exact calendar day your cash buffer dips below safe operating thresholds, giving you weeks to accelerate receivables.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Academic & Technical Verification (CS2682 Viva Section) */}
        <section className="max-w-5xl mx-auto px-6 py-10 border-t border-line">
          <div className="bg-sunken border border-line rounded-[8px] p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-[14px] font-semibold text-ink mb-1">
                  Academic Project Verification
                </div>
                <div className="text-[13px] text-ink-2 space-y-1 mt-3">
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
                <div className="text-[14px] font-semibold text-ink mb-1">
                  Technical Architecture
                </div>
                <div className="text-[13px] text-ink-2 space-y-1 mt-3">
                  <div>
                    <span className="text-ink-3">Platform:</span> Next.js 16 (App Router + Turbopack)
                  </div>
                  <div>
                    <span className="text-ink-3">Database:</span> PostgreSQL on Neon (Pooled & Direct)
                  </div>
                  <div>
                    <span className="text-ink-3">Data Isolation:</span> Strict 3NF multi-tenant company keys
                  </div>
                  <div>
                    <span className="text-ink-3">Precision:</span> Decimal(14, 2) currency arithmetic
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Footer */}
      <footer className="border-t border-line bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between text-[13px] text-ink-3 gap-3">
          <div>
            FinFlow • Business Cash Flow Intelligence & Invoicing
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-ink">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-ink">
              Create workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
