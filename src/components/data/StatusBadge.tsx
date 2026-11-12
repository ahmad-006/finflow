import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
export type ClientRisk = "HEALTHY" | "WATCHLIST" | "CRITICAL";

interface StatusBadgeProps {
  status: InvoiceStatus | ClientRisk;
  detail?: string;
  className?: string;
}

export function StatusBadge({ status, detail, className }: StatusBadgeProps) {
  const norm = status.toUpperCase();

  let variant:
    | "draft"
    | "sent"
    | "paid"
    | "overdue"
    | "cancelled"
    | "healthy"
    | "watchlist"
    | "critical" = "draft";
  let label = "Draft";

  switch (norm) {
    case "DRAFT":
      variant = "draft";
      label = "Draft";
      break;
    case "SENT":
      variant = "sent";
      label = "Sent";
      break;
    case "PAID":
      variant = "paid";
      label = "Paid";
      break;
    case "OVERDUE":
      variant = "overdue";
      label = "Overdue";
      break;
    case "CANCELLED":
      variant = "cancelled";
      label = "Cancelled";
      break;
    case "HEALTHY":
      variant = "healthy";
      label = "Healthy";
      break;
    case "WATCHLIST":
      variant = "watchlist";
      label = "Watchlist";
      break;
    case "CRITICAL":
      variant = "critical";
      label = "Critical";
      break;
    default:
      variant = "draft";
      label = status;
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Badge variant={variant}>{label}</Badge>
      {detail && <span className="text-[13px] text-ink-3">{detail}</span>}
    </div>
  );
}
