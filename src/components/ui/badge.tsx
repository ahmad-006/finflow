import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled"
  | "healthy"
  | "watchlist"
  | "critical";

const variantStyles: Record<BadgeVariant, { bg: string; text: string; defaultLabel: string }> = {
  draft: {
    bg: "bg-fog",
    text: "text-ink-3",
    defaultLabel: "Draft",
  },
  sent: {
    bg: "bg-fog",
    text: "text-ink",
    defaultLabel: "Sent",
  },
  paid: {
    bg: "bg-moss-tint",
    text: "text-moss",
    defaultLabel: "Paid",
  },
  overdue: {
    bg: "bg-ember-tint",
    text: "text-ember-ink",
    defaultLabel: "Overdue",
  },
  cancelled: {
    bg: "bg-fog",
    text: "text-ink-3",
    defaultLabel: "Cancelled",
  },
  healthy: {
    bg: "bg-moss-tint",
    text: "text-moss",
    defaultLabel: "Healthy",
  },
  watchlist: {
    bg: "bg-amber-tint",
    text: "text-amber",
    defaultLabel: "Watchlist",
  },
  critical: {
    bg: "bg-ember-tint",
    text: "text-ember-ink",
    defaultLabel: "Critical",
  },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  className,
  variant = "draft",
  children,
  ...props
}: BadgeProps) {
  const style = variantStyles[variant] || variantStyles.draft;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center h-[26px] px-3 rounded-full text-[13px] font-medium border-0 select-none whitespace-nowrap",
        style.bg,
        style.text,
        className
      )}
      {...props}
    >
      {children ?? style.defaultLabel}
    </span>
  );
}
