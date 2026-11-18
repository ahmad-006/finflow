import * as React from "react";
import type { InvoiceKPIs } from "@/modules/invoices/types";
import { formatMoney } from "@/modules/invoices/currency";

interface InvoiceKPIStripProps {
  kpis: InvoiceKPIs;
  baseCurrency?: string;
}

export function InvoiceKPIStrip({ kpis, baseCurrency = "PKR" }: InvoiceKPIStripProps) {
  const currencyCode = (baseCurrency as any) || "PKR";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4 border-y border-line">
      {/* 1. Outstanding Receivables */}
      <div className="flex flex-col gap-1 p-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-ink/50">
            Outstanding
          </span>
          {kpis.activeCount > 0 && (
            <span className="text-[11px] font-mono text-ink/60">
              {kpis.activeCount} open
            </span>
          )}
        </div>
        <div className="text-xl sm:text-2xl font-serif tracking-tight text-ink">
          {formatMoney(kpis.totalOutstanding, currencyCode)}
        </div>
        <span className="text-[11px] text-ink/50">
          Unpaid active invoices
        </span>
      </div>

      {/* 2. Overdue Exposure */}
      <div className="flex flex-col gap-1 p-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-ink/50">
            Overdue
          </span>
          {kpis.overdueCount > 0 && (
            <span className="text-[11px] font-mono text-ember font-medium">
              {kpis.overdueCount} delayed
            </span>
          )}
        </div>
        <div
          className={`text-xl sm:text-2xl font-serif tracking-tight ${
            kpis.totalOverdue > 0 ? "text-ember" : "text-ink"
          }`}
        >
          {formatMoney(kpis.totalOverdue, currencyCode)}
        </div>
        <span className="text-[11px] text-ink/50">
          Past payment terms
        </span>
      </div>

      {/* 3. Settled This Month */}
      <div className="flex flex-col gap-1 p-2">
        <span className="text-xs font-mono uppercase tracking-wider text-ink/50">
          Settled This Month
        </span>
        <div className="text-xl sm:text-2xl font-serif tracking-tight text-ink">
          {formatMoney(kpis.totalPaidThisMonth, currencyCode)}
        </div>
        <span className="text-[11px] text-ink/50">
          Realized cash inflow
        </span>
      </div>

      {/* 4. Unissued Drafts */}
      <div className="flex flex-col gap-1 p-2">
        <span className="text-xs font-mono uppercase tracking-wider text-ink/50">
          Drafts
        </span>
        <div className="text-xl sm:text-2xl font-serif tracking-tight text-ink">
          {formatMoney(kpis.totalDrafts, currencyCode)}
        </div>
        <span className="text-[11px] text-ink/50">
          Unpublished pipeline
        </span>
      </div>
    </div>
  );
}
