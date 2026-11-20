import * as React from "react";
import type { InvoiceStatus } from "@/modules/invoices/types";

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

export function InvoiceStatusBadge({ status, className = "" }: InvoiceStatusBadgeProps) {
  let badgeStyles = "bg-fog text-ink/70 border-line";
  let label: string = status;

  switch (status) {
    case "DRAFT":
      badgeStyles = "bg-fog text-ink/60 border-line";
      label = "Draft";
      break;
    case "SENT":
      badgeStyles = "bg-fog-2 text-ink border-line";
      label = "Sent";
      break;
    case "PAID":
      badgeStyles = "bg-emerald-50 text-emerald-800 border-emerald-200";
      label = "Paid";
      break;
    case "OVERDUE":
      badgeStyles = "bg-ember/5 text-ember border-ember/20";
      label = "Overdue";
      break;
    case "CANCELLED":
      badgeStyles = "bg-fog/60 text-ink/40 border-line line-through";
      label = "Cancelled";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-tight whitespace-nowrap shrink-0 border ${badgeStyles} ${className}`}
    >
      {label}
    </span>
  );
}
