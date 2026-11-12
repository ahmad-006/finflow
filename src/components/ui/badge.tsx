import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[6px] h-6 px-2.5 text-[12px] font-medium leading-none whitespace-nowrap select-none",
  {
    variants: {
      variant: {
        draft: "bg-sunken text-ink-2",
        sent: "bg-foam text-ink",
        paid: "bg-foam text-lagoon-ink",
        overdue: "bg-ebb-tint text-ebb",
        cancelled: "bg-sunken text-ink-3",
        healthy: "bg-foam text-lagoon-ink",
        watchlist: "bg-amber-tint text-amber",
        critical: "bg-ebb-tint text-ebb",
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
