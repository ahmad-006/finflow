"use client";

import * as React from "react";
import Link from "next/link";
import { Band } from "@/components/shell/Band";
import { InkLine } from "@/components/line/InkLine";
import { Ruler } from "@/components/line/Ruler";
import { Figure } from "@/components/line/Figure";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { series, DEMO, formatDemoDate } from "@/lib/demo-forecast";
import { renderOverviewBreach, renderOverviewNoBreach, StatementSentence } from "@/lib/sentences";
import { cn } from "@/lib/utils";

interface ActionableInvoice {
  id: string;
  client: string;
  number: string;
  dueText: string;
  amount: number;
  status: "SENT" | "OVERDUE" | "PAID";
  daysOverdue?: number;
  dueDate: string;
}

const INITIAL_OVERDUE: ActionableInvoice[] = [
  {
    id: "inv-47",
    client: "Crestline Packaging LLC",
    number: "INV-2026-0031",
    dueText: "47 days overdue",
    amount: 285000,
    status: "OVERDUE",
    daysOverdue: 47,
    dueDate: "27 Sep",
  },
  {
    id: "inv-19",
    client: "Northgate Logistics GmbH",
    number: "INV-2026-0036",
    dueText: "19 days overdue",
    amount: 190000,
    status: "OVERDUE",
    daysOverdue: 19,
    dueDate: "25 Oct",
  },
  {
    id: "inv-5",
    client: "Salma Furniture Works",
    number: "INV-2026-0039",
    dueText: "5 days overdue",
    amount: 143300,
    status: "OVERDUE",
    daysOverdue: 5,
    dueDate: "8 Nov",
  },
];

const INITIAL_UPCOMING: ActionableInvoice[] = [
  {
    id: "inv-3",
    client: "Hamdan Textiles (Pvt) Ltd",
    number: "INV-2026-0042",
    dueText: "Due 16 Nov",
    amount: 624000,
    status: "SENT",
    dueDate: "16 Nov",
  },
  {
    id: "inv-12",
    client: "Dr. A. Qureshi Clinics",
    number: "INV-2026-0043",
    dueText: "Due 25 Nov",
    amount: 410500,
    status: "SENT",
    dueDate: "25 Nov",
  },
  {
    id: "inv-22",
    client: "Kinnaird Print House",
    number: "INV-2026-0045",
    dueText: "Due 5 Dec",
    amount: 380500,
    status: "SENT",
    dueDate: "5 Dec",
  },
];

export default function DashboardOverviewPage() {
  const [forecastMode, setForecastMode] = React.useState<"expected" | "onTime">("expected");
  const [activeDay, setActiveDay] = React.useState(17);
  const [overdueInvoices, setOverdueInvoices] = React.useState<ActionableInvoice[]>(INITIAL_OVERDUE);
  const [upcomingInvoices, setUpcomingInvoices] = React.useState<ActionableInvoice[]>(INITIAL_UPCOMING);
  const [liquidCash, setLiquidCash] = React.useState(DEMO.opening);
  const [recentlySettledId, setRecentlySettledId] = React.useState<string | null>(null);

  const forecastValues = React.useMemo(() => {
    return series(forecastMode);
  }, [forecastMode]);

  const onTimeGhost = React.useMemo(() => {
    return forecastMode === "expected" ? series("onTime") : undefined;
  }, [forecastMode]);

  // Handle Mark as Paid
  const handleMarkPaid = (id: string, amount: number) => {
    setOverdueInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status: "PAID" as const } : inv))
    );
    setLiquidCash((prev) => prev + amount);
    setRecentlySettledId(id);
    setTimeout(() => setRecentlySettledId(null), 1200);
  };

  const overdueCount = overdueInvoices.filter((i) => i.status === "OVERDUE").length;
  const overdueTotal = overdueInvoices
    .filter((i) => i.status === "OVERDUE")
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="w-full bg-white text-ink font-sans">
      {/* Screen reader title (Section 9.3) */}
      <h1 className="sr-only">Overview</h1>

      {/* Band 1: White band - Hero Figure & Live InkLine Chart */}
      <section className="bg-white pt-6 pb-8 md:pt-8 md:pb-10">
        <div className="mx-auto max-w-[1200px] px-[var(--gutter)]">
          {/* Header row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-[13px] text-ink-3 font-medium uppercase tracking-[0.06em]">Liquid cash today</p>
              <div className="mt-1 transition-colors duration-500">
                <Figure value={liquidCash} currency="PKR" size="xl" />
              </div>
              <div className="mt-2">
                <StatementSentence>
                  {overdueCount > 0 ? (
                    renderOverviewBreach("PKR 238,900", "30 Nov", 5)
                  ) : (
                    renderOverviewNoBreach("PKR 1,420,000", "28 Nov")
                  )}
                </StatementSentence>
              </div>
            </div>

            {/* Segmented Control: [On time | Expected] */}
            <div className="flex flex-col items-start md:items-end gap-1.5 self-start md:self-end">
              <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-ink-3">Forecast Scenario</span>
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
              <span className="hidden sm:inline">— Daily trajectory under {forecastMode === "expected" ? "risk-adjusted latency" : "perfect on-time settlement"}</span>
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
                <span>Floor (1.2M)</span>
              </div>
            </div>
          </div>

          {/* InkLine Graphic (Compact 240px height) */}
          <div className="mt-2 h-[220px] sm:h-[250px] w-full">
            <InkLine
              values={forecastValues}
              ghost={onTimeGhost}
              buffer={DEMO.buffer}
              height={250}
              currency="PKR"
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

      {/* Band 2: Fog band - 4 Supporting Figures directly on band (No boxes!) */}
      <section className="bg-fog py-10 md:py-12">
        <div className="mx-auto max-w-[1200px] px-[var(--gutter)]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Column 1: Receivables */}
            <div>
              <p className="text-[13px] text-ink-3 font-medium">Receivables, 30 days</p>
              <div className="mt-1">
                <Figure value={2222750} currency="PKR" size="lg" />
              </div>
              <p className="mt-0.5 text-xs text-ink-3">5 active invoices</p>
            </div>

            {/* Column 2: Overdue */}
            <div>
              <p className="text-[13px] text-ink-3 font-medium">Overdue</p>
              <div className="mt-1">
                <Figure value={overdueTotal} currency="PKR" size="lg" />
              </div>
              <p className="mt-0.5 text-xs text-ember-ink font-medium">
                {overdueCount} {overdueCount === 1 ? "invoice" : "invoices"}
              </p>
            </div>

            {/* Column 3: Lowest balance */}
            <div>
              <p className="text-[13px] text-ink-3 font-medium">Lowest projected point</p>
              <div className="mt-1">
                <Figure value={961100} currency="PKR" size="lg" />
              </div>
              <p className="mt-0.5 text-xs text-ink-3">Expected on 30 Nov</p>
            </div>

            {/* Column 4: First day below buffer */}
            <div>
              <p className="text-[13px] text-ink-3 font-medium">First day below buffer</p>
              <p className="mt-1 text-2xl sm:text-[28px] leading-tight tracking-[-0.025em] font-light text-ember-ink">
                30 Nov
              </p>
              <p className="mt-0.5 text-xs text-ink-3">PKR 238,900 deficit</p>
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
              <h2 className="text-[24px] font-semibold text-ink tracking-tight pb-4 border-b border-line-strong">
                Needs attention
              </h2>

              <div className="divide-y divide-line">
                {/* Breach Warning Row */}
                <div className="py-5 flex items-center justify-between">
                  <div>
                    <p className="text-[17px] font-medium text-ember-ink">
                      Cash falls below your buffer
                    </p>
                    <p className="text-[14px] text-ink-3 mt-0.5">
                      PKR 238,900 short on 30 Nov
                    </p>
                  </div>
                  <Badge variant="critical">Breach</Badge>
                </div>

                {/* Overdue Invoice Rows */}
                {overdueInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className={cn(
                      "py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 transition-colors",
                      recentlySettledId === inv.id && "bg-moss-tint/40 rounded-[14px] px-3 -mx-3"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-[16px] sm:text-[17px] font-medium text-ink truncate">{inv.client}</p>
                      <p className="text-[13px] sm:text-[14px] text-ink-3 mt-0.5">
                        {inv.number} · {inv.dueText}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                      <Figure value={inv.amount} currency="PKR" size="row" />
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
                ))}
              </div>
            </div>

            {/* Right Ledger: Next 14 days */}
            <div>
              <h2 className="text-[24px] font-semibold text-ink tracking-tight pb-4 border-b border-line-strong">
                Next 14 days
              </h2>

              <div className="divide-y divide-line">
                {upcomingInvoices.map((inv) => (
                  <div key={inv.id} className="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="min-w-0">
                      <p className="text-[16px] sm:text-[17px] font-medium text-ink truncate">{inv.client}</p>
                      <p className="text-[13px] sm:text-[14px] text-ink-3 mt-0.5">
                        {inv.number} · {inv.dueText}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                      <Figure value={inv.amount} currency="PKR" size="row" />
                      <Badge variant="sent">Sent</Badge>
                    </div>
                  </div>
                ))}

                {/* Scheduled Expense Row */}
                <div className="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-[16px] sm:text-[17px] font-medium text-ink">Payroll & Executive Salaries</p>
                    <p className="text-[13px] sm:text-[14px] text-ink-3 mt-0.5">
                      Scheduled outflow · 28 Nov
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                    <span className="text-[16px] sm:text-[17px] font-medium text-ink tabular-nums">
                      PKR 940,000.00
                    </span>
                    <Badge variant="draft">Scheduled</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
