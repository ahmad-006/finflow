"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  CreditCard,
  FileText,
  Clock,
  RotateCcw,
  Receipt,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { recordPaymentAction } from "@/modules/invoices/actions";
import { markExpensePaidAction } from "@/modules/expenses/actions";
import type { DayForecastDetails, DetailedInflowEvent, DetailedOutflowEvent } from "@/modules/treasury/types";

interface CashFlowDayDetailViewProps {
  day: DayForecastDetails;
  mode?: "onTime" | "expected";
}

export function CashFlowDayDetailView({ day, mode = "expected" }: CashFlowDayDetailViewProps) {
  const router = useRouter();
  const [settlingInvoiceId, setSettlingInvoiceId] = React.useState<string | null>(null);
  const [settlingExpenseId, setSettlingExpenseId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const isBufferWarning =
    !day.isBreach && day.closingBalance < day.safetyBuffer * 1.25;

  const handleSettleInvoice = async (inv: DetailedInflowEvent) => {
    setActionError(null);
    setSettlingInvoiceId(inv.id);
    try {
      const res = await recordPaymentAction({
        invoiceId: inv.id,
        paidAmount: inv.remainingAmount,
        notes: `Quick settlement from Day Details (${day.date})`,
      });
      if (!res.success) {
        setActionError(res.error || "Failed to settle invoice.");
      } else {
        router.refresh();
      }
    } catch {
      setActionError("An unexpected error occurred while settling invoice.");
    } finally {
      setSettlingInvoiceId(null);
    }
  };

  const handleSettleExpense = async (exp: DetailedOutflowEvent) => {
    setActionError(null);
    setSettlingExpenseId(exp.id);
    try {
      const res = await markExpensePaidAction(exp.id, {
        reference: `Quick settlement Day Details (${day.date})`,
      });
      if (!res.success) {
        setActionError(res.error || "Failed to settle expense.");
      } else {
        router.refresh();
      }
    } catch {
      setActionError("An unexpected error occurred while settling expense.");
    } finally {
      setSettlingExpenseId(null);
    }
  };

  return (
    <div className="w-full bg-white text-ink">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-line">
        <div>
          <nav className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-ink-3 mb-2">
            <Link href="/cash-flow" className="hover:text-ink transition-colors">
              Treasury & Forecasting
            </Link>
            <span>/</span>
            <Link href="/cash-flow" className="hover:text-ink transition-colors">
              Cash flow
            </Link>
            <span>/</span>
            <span className="text-ink font-semibold">{day.displayDate}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink tracking-tight">
              {day.dayOfWeek}, {day.displayDate}
            </h1>

            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-fog text-ink-2 border border-line">
              {day.isToday ? "Today · Day 0" : `Day ${day.dayIndex} of 30`}
            </span>

            {day.isBreach ? (
              <Badge variant="critical">
                Deficit: {formatMoney(day.deficitAmount, day.baseCurrency)}
              </Badge>
            ) : isBufferWarning ? (
              <Badge variant="watchlist">Buffer warning</Badge>
            ) : (
              <Badge variant="healthy">Healthy</Badge>
            )}
          </div>

          <p className="text-sm text-ink-2 mt-2">
            {day.isBreach
              ? `Projected closing balance breaches your safety buffer by ${formatMoney(day.deficitAmount, day.baseCurrency)}.`
              : isBufferWarning
              ? `Projected balance remains above buffer, but is within 25% of your ${formatMoney(day.safetyBuffer, day.baseCurrency)} safety floor.`
              : `Liquidity remains healthy above your safety buffer floor of ${formatMoney(day.safetyBuffer, day.baseCurrency)}.`}
          </p>
        </div>

        {/* Day Pagination & Overview Links */}
        <div className="flex items-center gap-2 self-start md:self-end">
          <Link
            href="/cash-flow"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium text-ink-2 bg-fog hover:bg-fog/80 border border-line transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>30-Day forecast</span>
          </Link>

          {day.prevDate && (
            <Link
              href={`/cash-flow/${day.prevDate}?mode=${mode}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium text-ink-2 bg-white hover:bg-fog border border-line transition-colors"
              title="Previous day"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Prev day</span>
            </Link>
          )}

          {day.nextDate && (
            <Link
              href={`/cash-flow/${day.nextDate}?mode=${mode}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium text-ink-2 bg-white hover:bg-fog border border-line transition-colors"
              title="Next day"
            >
              <span>Next day</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {actionError && (
        <div className="my-4 p-4 rounded-[12px] bg-ember/10 border border-ember text-ember-ink text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 5-Metric Financial Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 lg:gap-6 py-6 border-b border-line my-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3">
            Opening balance
          </span>
          <span className="text-xl sm:text-2xl font-serif font-bold text-ink">
            {formatMoney(day.openingBalance, day.baseCurrency)}
          </span>
          <span className="text-[11px] text-ink-3">Starting midnight cash</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3">
            Maturing inflows
          </span>
          <span className="text-xl sm:text-2xl font-serif font-bold text-moss">
            +{formatMoney(day.totalInflows, day.baseCurrency)}
          </span>
          <span className="text-[11px] text-ink-3">
            {day.inflows.length} {day.inflows.length === 1 ? "receivable" : "receivables"}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3">
            Scheduled outflows
          </span>
          <span className="text-xl sm:text-2xl font-serif font-bold text-ink">
            {day.totalOutflows > 0 ? "-" : ""}
            {formatMoney(day.totalOutflows, day.baseCurrency)}
          </span>
          <span className="text-[11px] text-ink-3">
            {day.outflows.length} {day.outflows.length === 1 ? "payable" : "payables"}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3">
            Daily net change
          </span>
          <span
            className={cn(
              "text-xl sm:text-2xl font-serif font-bold",
              day.netChange > 0
                ? "text-moss"
                : day.netChange < 0
                ? "text-ember-ink"
                : "text-ink"
            )}
          >
            {day.netChange > 0 ? "+" : day.netChange < 0 ? "-" : ""}
            {formatMoney(Math.abs(day.netChange), day.baseCurrency)}
          </span>
          <span className="text-[11px] text-ink-3">Inflows minus outflows</span>
        </div>

        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3">
            Closing balance
          </span>
          <span
            className={cn(
              "text-xl sm:text-2xl font-serif font-bold",
              day.isBreach ? "text-ember-ink" : "text-ink"
            )}
          >
            {formatMoney(day.closingBalance, day.baseCurrency)}
          </span>
          <span className="text-[11px] text-ink-3">
            Buffer: {formatMoney(day.safetyBuffer, day.baseCurrency)}
          </span>
        </div>
      </div>

      {/* Main Content: Dual Inflow and Outflow Ledgers */}
      <div className="space-y-10 my-8">
        {/* Section 1: Inflows */}
        <section aria-labelledby="inflows-heading">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 id="inflows-heading" className="text-lg font-serif font-bold text-ink">
                Maturing Accounts Receivable
              </h2>
              <p className="text-xs text-ink-3">
                Customer payments expected or overdue on this date (
                {mode === "expected" ? "risk-adjusted latency mode" : "contractual on-time mode"}).
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-moss self-start sm:self-auto">
              Total: +{formatMoney(day.totalInflows, day.baseCurrency)}
            </span>
          </div>

          {day.inflows.length === 0 ? (
            <div className="p-8 text-center rounded-[12px] border border-line bg-fog/30 text-ink-3 text-xs">
              No customer receivables are scheduled or overdue for this date.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[12px] border border-line">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line bg-fog/60 text-ink-3 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Original Amount</th>
                    <th className="py-3 px-4 text-right">Base Equivalent</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {day.inflows.map((inv) => (
                    <tr key={inv.id} className="hover:bg-fog/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-ink">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="hover:underline text-ink flex items-center gap-1"
                        >
                          <span>{inv.invoiceNumber}</span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-ink">{inv.clientName}</span>
                          <span className="text-[11px] text-ink-3">Due: {inv.dueDate}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-ink-2">
                        {inv.currency} {Number(inv.totalAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        {inv.currency !== day.baseCurrency && (
                          <span className="block text-[10px] text-ink-3">
                            FX Rate: {Number(inv.exchangeRate).toFixed(4)}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-moss whitespace-nowrap">
                        +{formatMoney(inv.baseAmount, day.baseCurrency)}
                        {inv.isOverdue && (
                          <span className="block text-[10px] text-ink-3 font-normal">
                            (0.70 haircut factor)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {inv.isOverdue ? (
                          <Badge variant="overdue">Overdue</Badge>
                        ) : (
                          <Badge variant="sent">Open</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="compact"
                          disabled={settlingInvoiceId === inv.id}
                          onClick={() => handleSettleInvoice(inv)}
                          className="text-xs h-7 px-2.5 rounded-full"
                        >
                          {settlingInvoiceId === inv.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            "Mark paid"
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Section 2: Outflows */}
        <section aria-labelledby="outflows-heading">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 id="outflows-heading" className="text-lg font-serif font-bold text-ink">
                Scheduled Operational Payables
              </h2>
              <p className="text-xs text-ink-3">
                Vendor bills, payroll disbursements, taxes, and subscriptions due on this date.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-ink self-start sm:self-auto">
              Total: {day.totalOutflows > 0 ? "-" : ""}
              {formatMoney(day.totalOutflows, day.baseCurrency)}
            </span>
          </div>

          {day.outflows.length === 0 ? (
            <div className="p-8 text-center rounded-[12px] border border-line bg-fog/30 text-ink-3 text-xs">
              No operational expenses or vendor liabilities scheduled for this date.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[12px] border border-line">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line bg-fog/60 text-ink-3 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Expense Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Recurrence</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {day.outflows.map((exp) => (
                    <tr key={exp.id} className="hover:bg-fog/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-ink">
                        <div className="flex flex-col">
                          <span>{exp.title}</span>
                          {exp.notes && (
                            <span className="text-[11px] text-ink-3 font-normal truncate max-w-xs">
                              {exp.notes}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-mono bg-fog text-ink-2">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-ink-3">
                        {exp.recurrence || "ONE_OFF"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-ink-2">
                        {exp.dueDate}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-ink whitespace-nowrap">
                        -{formatMoney(exp.amount, day.baseCurrency)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {exp.isOverdue ? (
                          <Badge variant="overdue">Overdue</Badge>
                        ) : (
                          <Badge variant="draft">Pending</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="compact"
                          disabled={settlingExpenseId === exp.id}
                          onClick={() => handleSettleExpense(exp)}
                          className="text-xs h-7 px-2.5 rounded-full"
                        >
                          {settlingExpenseId === exp.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            "Mark paid"
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Educational Explanatory Box */}
      <div className="mt-12 p-6 rounded-[16px] bg-fog/40 border border-line text-xs">
        <h3 className="font-serif font-bold text-ink text-sm mb-2">
          How this day's cash balance is modeled
        </h3>
        <p className="text-ink-2 leading-relaxed mb-3">
          The opening balance represents liquidity at 00:00 UTC, inherited from the previous day's closing position.
          Maturing inflows add cash based on client payment latency history. Scheduled operational outflows are
          deducted at full face value. If the closing balance drops below your designated safety buffer of{" "}
          {formatMoney(day.safetyBuffer, day.baseCurrency)}, the system flags a deficit risk alert.
        </p>
        <div className="flex items-center gap-4 text-ink-3 font-mono text-[11px]">
          <span>• Base currency: {day.baseCurrency}</span>
          <span>• Mode: {mode === "expected" ? "Expected (Latency-adjusted)" : "On-Time (Due dates)"}</span>
        </div>
      </div>
    </div>
  );
}
