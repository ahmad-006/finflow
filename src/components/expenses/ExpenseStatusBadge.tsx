import * as React from "react";
import type { ExpenseStatus } from "@/modules/expenses/types";

interface ExpenseStatusBadgeProps {
  status: ExpenseStatus;
  className?: string;
}

export function ExpenseStatusBadge({ status, className = "" }: ExpenseStatusBadgeProps) {
  let badgeStyles = "bg-fog text-ink-3 border-line";
  let dotStyle = "bg-ink-3";
  let label = "Scheduled";

  switch (status) {
    case "SCHEDULED":
      badgeStyles = "bg-fog text-ink-3 border-line";
      dotStyle = "bg-ink-3";
      label = "Scheduled";
      break;
    case "OVERDUE":
      badgeStyles = "bg-ember-tint text-ember-ink border-ember/20";
      dotStyle = "bg-ember-ink";
      label = "Overdue";
      break;
    case "PAID":
      badgeStyles = "bg-moss-tint text-moss border-moss/20";
      dotStyle = "bg-moss";
      label = "Paid";
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-tight whitespace-nowrap shrink-0 border ${badgeStyles} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyle} shrink-0`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
