import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[3px] h-[22px] px-2 text-[12px] font-medium leading-none whitespace-nowrap select-none",
  {
    variants: {
      variant: {
        draft: "bg-sunken text-ink-2",
        sent: "bg-brand-tint text-brand",
        paid: "bg-positive-tint text-positive",
        overdue: "bg-negative-tint text-negative",
        cancelled: "bg-sunken text-ink-3",
        healthy: "bg-positive-tint text-positive",
        watchlist: "bg-caution-tint text-caution",
        critical: "bg-negative-tint text-negative",
        neutral: "bg-sunken text-ink-2",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
