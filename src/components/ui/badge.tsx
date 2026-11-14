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

const variantConfig: Record<
  BadgeVariant,
  { dot: string; text: string; label?: string }
> = {
  paid: {
    dot: "bg-emerald-700",
    text: "text-gray-900",
    label: "Paid",
  },
  sent: {
    dot: "bg-amber-600",
    text: "text-zinc-700",
    label: "Sent",
  },
  overdue: {
    dot: "bg-red-700",
    text: "text-red-700",
    label: "Overdue",
  },
  draft: {
    dot: "bg-zinc-400",
    text: "text-zinc-500",
    label: "Draft",
  },
  cancelled: {
    dot: "bg-zinc-400",
    text: "text-zinc-500",
    label: "Cancelled",
  },
  healthy: {
    dot: "bg-emerald-700",
    text: "text-gray-900",
    label: "Healthy",
  },
  watchlist: {
    dot: "bg-amber-600",
    text: "text-zinc-700",
    label: "Watchlist",
  },
  critical: {
    dot: "bg-red-700",
    text: "text-red-700",
    label: "Critical",
  },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dotClassName?: string;
}

export function Badge({
  className,
  variant = "draft",
  dotClassName,
  children,
  ...props
}: BadgeProps) {
  const config = variantConfig[variant] || variantConfig.draft;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-medium select-none",
        config.text,
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          config.dot,
          dotClassName
        )}
        aria-hidden="true"
      />
      <span>{children ?? config.label}</span>
    </span>
  );
}
