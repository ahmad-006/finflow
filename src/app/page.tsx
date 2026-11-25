"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { TopNav } from "@/components/shell/TopNav";
import { InkLine } from "@/components/line/InkLine";
import { Ruler } from "@/components/line/Ruler";
import { Figure } from "@/components/line/Figure";
import { Badge } from "@/components/ui/badge";
import { series, DEMO, formatDemoDate } from "@/lib/demo-forecast";
import { StatementSentence } from "@/lib/sentences";

export default function HomePage() {
  const [activeDay, setActiveDay] = React.useState(17);
  const [storyState, setStoryState] = React.useState<1 | 2 | 3>(1);
  const storyRef = React.useRef<HTMLDivElement>(null);

  const expectedValues = React.useMemo(() => series("expected"), []);
  const onTimeValues = React.useMemo(() => series("onTime"), []);

  // Story stage scroll progression (3 states across 350vh pinned stage)
  React.useEffect(() => {
    const el = storyRef.current;
    if (!el) return;

    let raf = 0;
    const handleScroll = () => {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      if (total <= 0) return;
      const p = Math.min(1, Math.max(0, -r.top / total));
      el.style.setProperty("--p", p.toFixed(4));
      const nextState = p < 0.33 ? 1 : p < 0.66 ? 2 : 3;
      setStoryState(nextState);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(handleScroll);
    };

    handleScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Dynamic sentence for active day in hero
  const activeBalance = expectedValues[activeDay] ?? DEMO.opening;
  const isBelowBuffer = activeBalance < DEMO.buffer;
  const activeDateFormatted = formatDemoDate(activeDay);

  let heroSentence = `On ${activeDateFormatted} your cash is PKR ${(DEMO.buffer - activeBalance).toLocaleString()} below your buffer.`;
  if (!isBelowBuffer) {
    const headroom = activeBalance - DEMO.buffer;
    heroSentence = `On ${activeDateFormatted} you have PKR ${activeBalance.toLocaleString()}, PKR ${headroom.toLocaleString()} above your buffer.`;
  }

  return (
    <div className="min-h-screen bg-white text-ink font-sans selection:bg-ink selection:text-white">
      {/* 0. TopNav with scroll ruler for marketing */}
      <TopNav isMarketing={true} />

      {/* 1. HERO BAND (White band, centered, full bleed line) */}
      <section className="bg-white pt-12 sm:pt-16 md:pt-20 pb-12 sm:pb-16 flex flex-col items-center justify-between min-h-0 sm:min-h-[calc(100svh-56px)]">
        <div className="mx-auto max-w-[1200px] px-[var(--gutter)] text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-fog text-[13px] font-medium text-ink-2 mb-6">
            <span className="h-2 w-2 rounded-full bg-moss" />
            <span>Real-time cash flow intelligence</span>
          </div>

          <h1 className="text-[clamp(32px,5vw,62px)] font-semibold tracking-[-0.035em] text-ink leading-[1.06] max-w-[20ch]">
            Know your cash thirty days early.
          </h1>

          <p className="mt-4 sm:mt-5 text-[16px] sm:text-[18px] md:text-[20px] leading-[26px] sm:leading-[28px] font-normal tracking-[-0.01em] text-ink-2 max-w-[560px]">
            FinFlow forecasts your balance from invoices, expenses and how each client really pays.
          </p>

          <div className="mt-6 sm:mt-8 flex items-center gap-4 sm:gap-6">
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-11 sm:h-12 px-6 sm:px-7 rounded-full bg-ink text-white font-medium text-[15px] sm:text-[16px] hover:bg-ink-hover active:scale-[0.98] transition-all whitespace-nowrap"
            >
              Create workspace
            </Link>
            <Link
              href="/login"
              className="text-[15px] sm:text-[16px] font-medium text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink transition-colors whitespace-nowrap"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Full-bleed The Line (edge to edge, no container, height responsive) */}
        <div className="w-full mt-8 sm:mt-12 flex flex-col items-center">
          <div className="w-full max-w-[1200px] px-[var(--gutter)] flex flex-col sm:flex-row justify-between sm:items-baseline gap-1 text-[13px] text-ink-3 pb-2 border-b border-line">
            <span className="font-medium text-ink">30-Day Runway Forecast</span>
            <span>Safety Buffer: PKR {DEMO.buffer.toLocaleString()}</span>
          </div>

          <div className="w-full h-[32vh] sm:h-[40vh] min-h-[220px] sm:min-h-[260px] max-h-[480px] mt-4">
            <InkLine
              values={expectedValues}
              buffer={DEMO.buffer}
              label="Interactive 30-day runway line"
              className="w-full h-full"
            />
          </div>

          <div className="w-full max-w-[1200px] px-[var(--gutter)] mt-3">
            <Ruler
              days={31}
              activeDay={activeDay}
              onSelectDay={setActiveDay}
              ariaLabel="Homepage forecast ruler slider"
            />
          </div>

          <div className="mt-4 text-center px-4">
            <StatementSentence className="text-[15px] sm:text-[19px]">
              {heroSentence}
            </StatementSentence>
          </div>
        </div>
      </section>

      {/* 2. STORY STAGE:
          - Mobile / Tablet (< lg): No pinning (per spec 7.3). 3 stacked responsive bands with final visual states.
          - Desktop (>= lg): Pinned interactive scroll stage across 350vh with sticky position.
      */}
      <section id="story" className="border-t border-line bg-white">
        {/* Mobile / Tablet Stacked Chapters (< lg) */}
        <div className="lg:hidden divide-y divide-line">
          {/* Chapter 01 */}
          <div className="py-12 px-[var(--gutter)] max-w-[1200px] mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[12px] font-semibold text-ink-3 tracking-wide">
                01 · Baseline
              </span>
            </div>
            <h2 className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.035em] text-ink leading-tight">
              Every invoice is a date.
            </h2>
            <p className="mt-3 text-[16px] sm:text-[18px] leading-[26px] font-normal text-ink-2">
              Issue an invoice and it lands on the timeline on the exact day the money is due.
            </p>
            <p className="mt-2 text-[14px] text-ink-3">
              Your scheduled cash ins step upward with each expected settlement.
            </p>

            <div className="mt-6 bg-fog p-5 sm:p-6 rounded-[20px] border border-line">
              <div className="h-[200px] sm:h-[240px] w-full">
                <InkLine
                  values={onTimeValues}
                  buffer={DEMO.buffer}
                  label="On-time baseline forecast"
                />
              </div>
              <Ruler days={31} activeDay={12} />
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-[12px] font-medium text-ink bg-white rounded-full px-3 py-1 border border-line">
                  Day 3 · Hamdan Textiles (+624k)
                </span>
                <span className="text-[12px] font-medium text-ink bg-white rounded-full px-3 py-1 border border-line">
                  Day 7 · Northgate (+410k)
                </span>
                <span className="text-[12px] font-medium text-ink bg-white rounded-full px-3 py-1 border border-line">
                  Day 19 · Crestline (+520k)
                </span>
              </div>
            </div>
          </div>

          {/* Chapter 02 */}
          <div className="py-12 px-[var(--gutter)] max-w-[1200px] mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[12px] font-semibold text-ink-3 tracking-wide">
                02 · Dynamic Latency
              </span>
            </div>
            <h2 className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.035em] text-ink leading-tight">
              Late payers, priced in.
            </h2>
            <p className="mt-3 text-[16px] sm:text-[18px] leading-[26px] font-normal text-ink-2">
              FinFlow learns how each client actually pays, and moves the money to the day it will really arrive.
            </p>
            <div className="mt-4 p-3 rounded-[14px] bg-ember-tint text-[14px] font-medium text-ember-ink">
              Cash is below your buffer for 5 days, not 2.
            </div>

            <div className="mt-6 bg-fog p-5 sm:p-6 rounded-[20px] border border-line">
              <div className="h-[200px] sm:h-[240px] w-full">
                <InkLine
                  values={expectedValues}
                  ghost={onTimeValues}
                  buffer={DEMO.buffer}
                  label="Expected cash curve with latency"
                />
              </div>
              <Ruler days={31} activeDay={17} />
              <p className="mt-4 text-[13px] text-ink-3">
                Thin dashed line: on-time promise. Solid line: reality adjusted for 11 days average delay.
              </p>
            </div>
          </div>

          {/* Chapter 03 */}
          <div className="py-12 px-[var(--gutter)] max-w-[1200px] mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[12px] font-semibold text-ink-3 tracking-wide">
                03 · Multi-Currency
              </span>
            </div>
            <h2 className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.035em] text-ink leading-tight">
              One number, any currency.
            </h2>
            <p className="mt-3 text-[16px] sm:text-[18px] leading-[26px] font-normal text-ink-2">
              Bill in dollars, euros or pounds. Your books stay unified in rupees at the rate on the day you issue.
            </p>
            <p className="mt-2 text-[14px] text-ink-3">
              Daily market conversion rates synced directly into your forecasting runway.
            </p>

            <div className="mt-6 bg-fog p-5 sm:p-6 rounded-[20px] border border-line">
              <div className="divide-y divide-line text-[14px]">
                <div className="py-2.5 flex justify-between items-center gap-2">
                  <span className="text-ink font-medium">USD 2,340.75</span>
                  <span className="text-ink-3 hidden sm:inline text-xs">at 278.4000</span>
                  <span className="text-ink font-mono tabular-nums">PKR 651,664.80</span>
                </div>
                <div className="py-2.5 flex justify-between items-center gap-2">
                  <span className="text-ink font-medium">EUR 1,180.00</span>
                  <span className="text-ink-3 hidden sm:inline text-xs">at 301.2500</span>
                  <span className="text-ink font-mono tabular-nums">PKR 355,475.00</span>
                </div>
                <div className="py-2.5 flex justify-between items-center gap-2">
                  <span className="text-ink font-medium">GBP 960.40</span>
                  <span className="text-ink-3 hidden sm:inline text-xs">at 351.9000</span>
                  <span className="text-ink font-mono tabular-nums">PKR 337,964.76</span>
                </div>
                <div className="py-2.5 flex justify-between items-center gap-2">
                  <span className="text-ink font-medium">PKR 187,450.00</span>
                  <span className="text-ink-3 hidden sm:inline text-xs">at 1.0000</span>
                  <span className="text-ink font-mono tabular-nums">PKR 187,450.00</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-line-strong flex justify-between items-baseline">
                <span className="text-[14px] sm:text-[15px] font-semibold text-ink">Consolidated Total</span>
                <Figure value={1532554.56} currency="PKR" size="lg" />
              </div>
              <p className="mt-2 text-[12px] text-ink-3">Rates shown are verified mid-market examples.</p>
            </div>
          </div>
        </div>

        {/* Desktop Pinned Interactive Scroll Stage (>= lg) */}
        <div
          ref={storyRef}
          data-state={storyState}
          className="hidden lg:block relative"
          style={{ minHeight: "350vh" }}
        >
          <div className="sticky top-14 h-[calc(100svh-56px)] flex items-center py-8">
            <div className="mx-auto w-full max-w-[1200px] px-[var(--gutter)] grid grid-cols-12 gap-12 items-center">
              {/* Left 5 Columns: Story Headline & Body */}
              <div className="col-span-5 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[12px] font-semibold text-ink-3 tracking-wide">
                    0{storyState} of 03
                  </span>
                  <span className="h-1 w-1 rounded-full bg-line-strong" />
                  <span className="text-[12px] text-ink-3">Scroll to progress</span>
                </div>

                {storyState === 1 && (
                  <div className="transition-opacity duration-300">
                    <h2 className="text-[clamp(32px,4vw,48px)] font-semibold tracking-[-0.035em] text-ink leading-tight">
                      Every invoice is a date.
                    </h2>
                    <p className="mt-5 text-[18px] leading-[28px] font-normal text-ink-2">
                      Issue an invoice and it lands on the timeline on the exact day the money is due.
                    </p>
                    <p className="mt-4 text-[14px] text-ink-3">
                      Your scheduled cash ins step upward with each expected settlement.
                    </p>
                  </div>
                )}

                {storyState === 2 && (
                  <div className="transition-opacity duration-300">
                    <h2 className="text-[clamp(32px,4vw,48px)] font-semibold tracking-[-0.035em] text-ink leading-tight">
                      Late payers, priced in.
                    </h2>
                    <p className="mt-5 text-[18px] leading-[28px] font-normal text-ink-2">
                      FinFlow learns how each client actually pays, and moves the money to the day it will really arrive.
                    </p>
                    <div className="mt-4 p-3 rounded-[14px] bg-ember-tint text-[14px] font-medium text-ember-ink">
                      Cash is below your buffer for 5 days, not 2.
                    </div>
                  </div>
                )}

                {storyState === 3 && (
                  <div className="transition-opacity duration-300">
                    <h2 className="text-[clamp(32px,4vw,48px)] font-semibold tracking-[-0.035em] text-ink leading-tight">
                      One number, any currency.
                    </h2>
                    <p className="mt-5 text-[18px] leading-[28px] font-normal text-ink-2">
                      Bill in dollars, euros or pounds. Your books stay unified in rupees at the rate on the day you issue.
                    </p>
                    <p className="mt-4 text-[14px] text-ink-3">
                      Daily market conversion rates synced directly into your forecasting runway.
                    </p>
                  </div>
                )}
              </div>

              {/* Right 7 Columns: Visual Representation */}
              <div className="col-span-7 flex flex-col justify-center bg-fog p-8 rounded-[20px] border border-line">
                {storyState === 1 && (
                  <div className="w-full flex flex-col">
                    <div className="h-[250px] w-full">
                      <InkLine
                        values={onTimeValues}
                        buffer={DEMO.buffer}
                        label="On-time baseline forecast"
                      />
                    </div>
                    <Ruler days={31} activeDay={12} />
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      <span className="text-[12px] font-medium text-ink bg-white rounded-full px-3 py-1 border border-line">
                        Day 3 · Hamdan Textiles (+624k)
                      </span>
                      <span className="text-[12px] font-medium text-ink bg-white rounded-full px-3 py-1 border border-line">
                        Day 7 · Northgate (+410k)
                      </span>
                      <span className="text-[12px] font-medium text-ink bg-white rounded-full px-3 py-1 border border-line">
                        Day 19 · Crestline (+520k)
                      </span>
                    </div>
                  </div>
                )}

                {storyState === 2 && (
                  <div className="w-full flex flex-col">
                    <div className="h-[250px] w-full">
                      <InkLine
                        values={expectedValues}
                        ghost={onTimeValues}
                        buffer={DEMO.buffer}
                        label="Expected cash curve with latency"
                      />
                    </div>
                    <Ruler days={31} activeDay={17} />
                    <p className="mt-4 text-[14px] text-ink-3">
                      Thin dashed line: on-time promise. Solid line: reality adjusted for 11 days average delay.
                    </p>
                  </div>
                )}

                {storyState === 3 && (
                  <div className="w-full">
                    <div className="divide-y divide-line text-[14px]">
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-ink font-medium">USD 2,340.75</span>
                        <span className="text-ink-3">at 278.4000</span>
                        <span className="text-ink font-mono tabular-nums">PKR 651,664.80</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-ink font-medium">EUR 1,180.00</span>
                        <span className="text-ink-3">at 301.2500</span>
                        <span className="text-ink font-mono tabular-nums">PKR 355,475.00</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-ink font-medium">GBP 960.40</span>
                        <span className="text-ink-3">at 351.9000</span>
                        <span className="text-ink font-mono tabular-nums">PKR 337,964.76</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-ink font-medium">PKR 187,450.00</span>
                        <span className="text-ink-3">at 1.0000</span>
                        <span className="text-ink font-mono tabular-nums">PKR 187,450.00</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-line-strong flex justify-between items-baseline">
                      <span className="text-[15px] font-semibold text-ink">Consolidated Total</span>
                      <Figure value={1532554.56} currency="PKR" size="lg" />
                    </div>
                    <p className="mt-1 text-[12px] text-ink-3">Rates shown are verified mid-market examples.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. NEW SECTION: FINANCIAL ANATOMY (Fog Band, structured 4-column breakdown) */}
      <section className="bg-fog py-24 border-t border-line">
        <div className="mx-auto max-w-[1200px] px-[var(--gutter)]">
          <div className="max-w-[700px] mb-16">
            <p className="text-[13px] font-medium tracking-[0.06em] uppercase text-ink-3">
              Financial Architecture
            </p>
            <h2 className="text-[clamp(28px,3.5vw,42px)] font-semibold tracking-[-0.03em] text-ink leading-tight mt-1">
              How FinFlow models your business runway.
            </h2>
            <p className="mt-3 text-[17px] text-ink-2">
              Four unified streams feed your 30-day forecast curve continuously.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="border-t border-line-strong pt-5">
              <span className="text-[13px] font-semibold text-ink-3">01 / Reserves</span>
              <h3 className="text-[20px] font-semibold text-ink mt-2">
                Liquid Cash
              </h3>
              <p className="text-[15px] text-ink-2 mt-2 leading-relaxed">
                Bank balances and cash equivalents, updated instantly as customer payments clear and expenses settle.
              </p>
            </div>

            <div className="border-t border-line-strong pt-5">
              <span className="text-[13px] font-semibold text-ink-3">02 / Receivables</span>
              <h3 className="text-[20px] font-semibold text-ink mt-2">
                Invoices & Latency
              </h3>
              <p className="text-[15px] text-ink-2 mt-2 leading-relaxed">
                Sent and open invoices weighted by each customer’s real historical payment delay, not optimistic due dates.
              </p>
            </div>

            <div className="border-t border-line-strong pt-5">
              <span className="text-[13px] font-semibold text-ink-3">03 / Outflows</span>
              <h3 className="text-[20px] font-semibold text-ink mt-2">
                Scheduled Expenses
              </h3>
              <p className="text-[15px] text-ink-2 mt-2 leading-relaxed">
                Payroll, rent, subscriptions, and vendor payables pinned to exact dates so cash dips never surprise you.
              </p>
            </div>

            <div className="border-t border-line-strong pt-5">
              <span className="text-[13px] font-semibold text-ink-3">04 / Threshold</span>
              <h3 className="text-[20px] font-semibold text-ink mt-2">
                Safety Buffer
              </h3>
              <p className="text-[15px] text-ink-2 mt-2 leading-relaxed">
                Your defined operational floor. The moment a future projection dips below this line, early warnings trigger.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRODUCT BAND (White band with Overview peeking up, Section 7.4) */}
      <section id="product" className="bg-white pt-24 pb-0 overflow-hidden border-t border-line">
        <div className="mx-auto max-w-[1200px] px-[var(--gutter)] text-center">
          <p className="text-[13px] font-medium tracking-[0.06em] uppercase text-ink-3">
            The Product
          </p>
          <h2 className="text-[clamp(28px,3.5vw,44px)] font-semibold tracking-[-0.03em] text-ink leading-tight mt-1">
            One screen for the whole month.
          </h2>
          <p className="mt-3 text-[17px] md:text-[19px] leading-[26px] font-normal text-ink-2 max-w-[580px] mx-auto">
            Cash today, what is due, what is late, and the first day you fall below your buffer.
          </p>

          {/* Product Surface Crop (Flush with bottom edge) */}
          <div
            data-allow-container
            className="mt-14 mx-auto max-w-[1080px] rounded-t-[28px] border-t border-x border-line bg-fog shadow-float p-6 sm:p-10 pointer-events-none select-none text-left"
            aria-hidden="true"
          >
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-6 border-b border-line">
              <div>
                <p className="text-[13px] text-ink-3 font-medium">Liquid cash today</p>
                <div className="mt-1">
                  <Figure value={DEMO.opening} currency="PKR" size="xl" />
                </div>
              </div>
              <p className="text-[15px] font-medium text-ember-ink">
                Cash falls PKR 238,900 below your buffer on 30 Nov
              </p>
            </div>

            <div className="h-[240px] w-full mt-6">
              <InkLine
                values={expectedValues}
                buffer={DEMO.buffer}
                label="Product preview line"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. NEW SECTION: BEFORE VS. AFTER LEDGER (Fog Band, ~800px vertical) */}
      <section className="bg-fog py-24 border-t border-line">
        <div className="mx-auto max-w-[1200px] px-[var(--gutter)]">
          <div className="max-w-[720px] mb-14">
            <p className="text-[13px] font-medium tracking-[0.06em] uppercase text-ink-3">
              The Paradigm Shift
            </p>
            <h2 className="text-[clamp(28px,3.5vw,42px)] font-semibold tracking-[-0.03em] text-ink leading-tight mt-1">
              Spreadsheets look backward. FinFlow looks thirty days ahead.
            </h2>
            <p className="mt-3 text-[17px] text-ink-2">
              Traditional accounting software records history. FinFlow forecasts solvency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Left Ledger: Static Invoicing */}
            <div className="bg-white p-6 sm:p-8 rounded-[20px] border border-line">
              <h3 className="text-[20px] font-semibold text-ink pb-4 border-b border-line">
                Traditional Bookkeeping & Spreadsheets
              </h3>
              <div className="divide-y divide-line text-[15px]">
                <div className="py-4">
                  <p className="font-medium text-ink">Assumes invoices are paid on the exact due date</p>
                  <p className="text-ink-3 mt-1 text-[13px]">Ignores chronic 10 to 45-day client delays.</p>
                </div>
                <div className="py-4">
                  <p className="font-medium text-ink">Currencies converted manually or at month-end</p>
                  <p className="text-ink-3 mt-1 text-[13px]">Exchange rate shifts between issue and pay are lost.</p>
                </div>
                <div className="py-4">
                  <p className="font-medium text-ink">Cash shortfalls discovered the day before payroll</p>
                  <p className="text-ink-3 mt-1 text-[13px]">Zero buffer breach warnings ahead of time.</p>
                </div>
                <div className="py-4">
                  <p className="font-medium text-ink">Scattered across PDFs, WhatsApp chats, and bank portals</p>
                  <p className="text-ink-3 mt-1 text-[13px]">Hours wasted chasing status updates across disconnected tools.</p>
                </div>
              </div>
            </div>

            {/* Right Ledger: FinFlow Dynamic Runway */}
            <div className="bg-white p-6 sm:p-8 rounded-[20px] border border-line">
              <h3 className="text-[20px] font-semibold text-ink pb-4 border-b border-line flex items-center justify-between">
                <span>FinFlow Runway Intelligence</span>
                <Badge variant="healthy">Automated</Badge>
              </h3>
              <div className="divide-y divide-line text-[15px]">
                <div className="py-4">
                  <p className="font-medium text-ink">Payment latency calculated automatically per client</p>
                  <p className="text-ink-3 mt-1 text-[13px]">Expected cash moves dynamically to the true arrival date.</p>
                </div>
                <div className="py-4">
                  <p className="font-medium text-ink">Real-time mid-market rates consolidated into base PKR</p>
                  <p className="text-ink-3 mt-1 text-[13px]">Unified financial picture regardless of invoice denomination.</p>
                </div>
                <div className="py-4">
                  <p className="font-medium text-ink">Breach alerts 30 days before cash dips below buffer</p>
                  <p className="text-ink-3 mt-1 text-[13px]">Weeks of runway visibility to negotiate terms or delay payables.</p>
                </div>
                <div className="py-4">
                  <p className="font-medium text-ink">Unified timeline connecting invoices, expenses, and banking</p>
                  <p className="text-ink-3 mt-1 text-[13px]">Single source of truth accessible on one clean screen.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. NEW SECTION: CLIENT RISK PROFILES (White Band, ~750px vertical) */}
      <section className="bg-white py-24 border-t border-line">
        <div className="mx-auto max-w-[1200px] px-[var(--gutter)]">
          <div className="max-w-[700px] mb-12">
            <p className="text-[13px] font-medium tracking-[0.06em] uppercase text-ink-3">
              Client Intelligence
            </p>
            <h2 className="text-[clamp(28px,3.5vw,42px)] font-semibold tracking-[-0.03em] text-ink leading-tight mt-1">
              Know who pays on time, and who delays.
            </h2>
            <p className="mt-3 text-[17px] text-ink-2">
              FinFlow tracks payment latency profiles across all active clients so you can price terms accurately.
            </p>
          </div>

          {/* Client Reliability Ledger */}
          <div className="divide-y divide-line border-t border-b border-line">
            <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[17px] font-medium text-ink">Hamdan Textiles (Pvt) Ltd</p>
                <p className="text-[14px] text-ink-3 mt-0.5">Average payment latency: 0 days · 98% on-time record</p>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-[15px] font-medium text-ink tabular-nums">PKR 1,420,000 billed</span>
                <Badge variant="healthy">Healthy</Badge>
              </div>
            </div>

            <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[17px] font-medium text-ink">Dr. A. Qureshi Clinics</p>
                <p className="text-[14px] text-ink-3 mt-0.5">Average payment latency: +2 days · 94% on-time record</p>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-[15px] font-medium text-ink tabular-nums">PKR 820,000 billed</span>
                <Badge variant="healthy">Healthy</Badge>
              </div>
            </div>

            <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[17px] font-medium text-ink">Northgate Logistics GmbH</p>
                <p className="text-[14px] text-ink-3 mt-0.5">Average payment latency: +6 days · Net-30 terms frequently delayed</p>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-[15px] font-medium text-ink tabular-nums">EUR 8,400 billed</span>
                <Badge variant="watchlist">Watchlist</Badge>
              </div>
            </div>

            <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[17px] font-medium text-ink">Crestline Packaging LLC</p>
                <p className="text-[14px] text-ink-3 mt-0.5">Average payment latency: +14 days · Chronic cash flow buffer hazard</p>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-[15px] font-medium text-ink tabular-nums">USD 12,500 billed</span>
                <Badge variant="critical">Critical</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. MORE BAND: CAPABILITIES (Fog Band, Section 7.5) */}
      <section id="more" className="bg-fog py-24 border-t border-line">
        <div className="mx-auto max-w-[1200px] px-[var(--gutter)]">
          <div className="mb-12">
            <p className="text-[13px] font-medium tracking-[0.06em] uppercase text-ink-3">
              Capabilities
            </p>
            <h2 className="text-[clamp(28px,3.5vw,42px)] font-semibold tracking-[-0.03em] text-ink leading-tight mt-1">
              The rest of the work.
            </h2>
          </div>

          <div className="divide-y divide-line border-t border-b border-line bg-white rounded-[20px] px-6 sm:px-10 border">
            <div className="py-7 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-medium text-ink bg-fog rounded-full px-2.5 py-0.5">
                  PDF
                </span>
                <h3 className="text-[20px] font-semibold text-ink tracking-tight">
                  PDF invoices
                </h3>
              </div>
              <p className="text-[16px] text-ink-2 max-w-md">
                Download clean, professional, audit-compliant PDFs for any customer in one click.
              </p>
            </div>

            <div className="py-7 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-medium text-ink bg-fog rounded-full px-2.5 py-0.5">
                  Calendar
                </span>
                <h3 className="text-[20px] font-semibold text-ink tracking-tight">
                  Due-date calendar
                </h3>
              </div>
              <p className="text-[16px] text-ink-2 max-w-md">
                See what is due and what is going out, by month, week or chronological list.
              </p>
            </div>

            <div className="py-7 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-medium text-ink bg-fog rounded-full px-2.5 py-0.5">
                  Alerts
                </span>
                <h3 className="text-[20px] font-semibold text-ink tracking-tight">
                  Payment reminders
                </h3>
              </div>
              <p className="text-[16px] text-ink-2 max-w-md">
                Send contextual, polite payment reminders straight from the overdue invoice.
              </p>
            </div>

            <div className="py-7 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-medium text-ink bg-fog rounded-full px-2.5 py-0.5">
                  Ledger
                </span>
                <h3 className="text-[20px] font-semibold text-ink tracking-tight">
                  Client ledger
                </h3>
              </div>
              <p className="text-[16px] text-ink-2 max-w-md">
                See what each client has been billed, has settled, and still owes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. NEW SECTION: SECURITY & ARCHITECTURE GUARANTEES (White Band, ~700px vertical) */}
      <section className="bg-white py-24 border-t border-line">
        <div className="mx-auto max-w-[1200px] px-[var(--gutter)]">
          <div className="max-w-[700px] mb-14">
            <p className="text-[13px] font-medium tracking-[0.06em] uppercase text-ink-3">
              Security & Reliability
            </p>
            <h2 className="text-[clamp(28px,3.5vw,42px)] font-semibold tracking-[-0.03em] text-ink leading-tight mt-1">
              Built on strict tenant isolation.
            </h2>
            <p className="mt-3 text-[17px] text-ink-2">
              Every financial record, forecast curve, and audit log is cryptographically and relationally protected.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="border-t border-line-strong pt-5">
              <h3 className="text-[18px] font-semibold text-ink">Multi-Tenant Isolation</h3>
              <p className="text-[15px] text-ink-2 mt-2 leading-relaxed">
                PostgreSQL schema partitions each company workspace by strict company ID foreign keys. Data leakage between accounts is impossible.
              </p>
            </div>

            <div className="border-t border-line-strong pt-5">
              <h3 className="text-[18px] font-semibold text-ink">Standard JWT Authentication</h3>
              <p className="text-[15px] text-ink-2 mt-2 leading-relaxed">
                Stateless session verification with signed JOSE HS256 tokens and salted bcrypt password hashing protecting user credentials.
              </p>
            </div>

            <div className="border-t border-line-strong pt-5">
              <h3 className="text-[18px] font-semibold text-ink">Double-Entry Precision</h3>
              <p className="text-[15px] text-ink-2 mt-2 leading-relaxed">
                Exact arbitrary-precision decimal mathematics prevent floating-point rounding errors across foreign currency conversions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. CLOSE BAND (Fog band, Section 7.6) */}
      <section className="bg-fog py-36 border-t border-line text-center">
        <div className="mx-auto max-w-[1200px] px-[var(--gutter)] flex flex-col items-center">
          <h2 className="text-[clamp(36px,4.5vw,56px)] font-semibold tracking-[-0.035em] text-ink leading-tight">
            Know the day.
          </h2>
          <p className="mt-4 text-[18px] text-ink-2 max-w-[460px]">
            Forecast your runway with dynamic client payment latency.
          </p>

          <div className="mt-8 flex items-center gap-6">
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-12 px-7 rounded-full bg-ink text-white font-medium text-[16px] hover:bg-ink-hover active:scale-[0.98] transition-all"
            >
              Create workspace
            </Link>
            <Link
              href="/login"
              className="text-[16px] font-medium text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* 10. FOOTER (One row, Section 7.7) */}
      <footer className="bg-white py-12 border-t border-line">
        <div className="mx-auto max-w-[1200px] px-[var(--gutter)] flex flex-col sm:flex-row items-center justify-between gap-6 text-[14px] text-ink-3 text-center sm:text-left">
          <div className="flex items-center">
            <Image
              src="/finflow-logo-on-white.png"
              alt="FinFlow"
              width={109}
              height={25}
              className="h-5 w-auto object-contain"
            />
          </div>

          <p>Built for CS2682, Riphah International University</p>

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
