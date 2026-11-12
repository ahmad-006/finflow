import * as React from "react";
import { Money } from "./Money";
import { cn } from "@/lib/utils";

export interface PositionStripData {
  liquidCash: number;
  asOf: string;
  receivables30d: number;
  receivablesCount: number;
  overdue: number;
  overdueCount: number;
  cashGapDate?: string;
  cashGapStatus?: string;
  currency?: string;
}

export function PositionStrip({
  data,
  className,
}: {
  data: PositionStripData;
  className?: string;
}) {
  const currency = data.currency ?? "PKR";

  return (
    <div
      className={cn(
        "bg-sheet border border-line rounded-[20px] overflow-hidden grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-line",
        className
      )}
    >
      {/* 1. Liquid Cash (Hero figure) */}
      <div className="p-8 max-sm:p-5 flex flex-col justify-between">
        <span className="text-[14px] text-ink-2 font-medium">Liquid cash</span>
        <div className="my-3">
          <Money
            amount={data.liquidCash}
            currency={currency}
            variant="hero"
          />
        </div>
        <span className="text-[13px] text-ink-3">as of {data.asOf}</span>
      </div>

      {/* 2. Receivables, next 30 days */}
      <div className="p-8 max-sm:p-5 flex flex-col justify-between">
        <span className="text-[14px] text-ink-2 font-medium">
          Receivables, next 30 days
        </span>
        <div className="my-3">
          <Money
            amount={data.receivables30d}
            currency={currency}
            className="text-[28px] font-light text-ink"
          />
        </div>
        <span className="text-[13px] text-ink-3">
          {data.receivablesCount} {data.receivablesCount === 1 ? "invoice" : "invoices"}
        </span>
      </div>

      {/* 3. Overdue */}
      <div className="p-8 max-sm:p-5 flex flex-col justify-between">
        <span className="text-[14px] text-ink-2 font-medium">Overdue</span>
        <div className="my-3">
          <Money
            amount={data.overdue}
            currency={currency}
            className={cn(
              "text-[28px] font-light",
              data.overdue > 0 ? "text-ebb" : "text-ink"
            )}
          />
        </div>
        <span className="text-[13px] text-ink-3">
          {data.overdueCount} {data.overdueCount === 1 ? "invoice" : "invoices"}
        </span>
      </div>

      {/* 4. Cash gap */}
      <div className="p-8 max-sm:p-5 flex flex-col justify-between">
        <span className="text-[14px] text-ink-2 font-medium">Cash gap</span>
        <div className="my-3">
          {data.cashGapDate ? (
            <span className="num text-[28px] font-light text-ebb">
              {data.cashGapDate}
            </span>
          ) : (
            <span className="text-[22px] lg:text-[26px] font-light text-lagoon-ink">
              None in 30 days
            </span>
          )}
        </div>
        <span className="text-[13px] text-ink-3">
          {data.cashGapStatus ?? (data.cashGapDate ? "Below safety buffer" : "Above safety buffer")}
        </span>
      </div>
    </div>
  );
}
