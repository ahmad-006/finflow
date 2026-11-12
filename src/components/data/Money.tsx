import * as React from "react";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MoneyProps {
  amount: number | string;
  currency?: string;
  decimals?: number;
  variant?: "body" | "hero" | "total" | "table";
  className?: string;
}

export function Money({
  amount,
  currency = "PKR",
  decimals,
  variant = "body",
  className,
}: MoneyProps) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const isNegative = !isNaN(num) && num < 0;
  const isZero = !isNaN(num) && num === 0;

  const formatted = formatMoney(amount, currency, {
    decimals,
    compactHero: variant === "hero",
  });

  return (
    <span
      className={cn(
        "num inline-block whitespace-nowrap",
        variant === "hero" && "font-serif text-[44px] leading-[48px] font-medium text-ink",
        variant === "total" && "font-serif text-[32px] leading-[40px] font-medium text-ink",
        variant === "table" && "text-right font-normal",
        variant === "body" && "text-[14px]",
        isNegative && "text-negative font-medium",
        isZero && "text-ink-3",
        className
      )}
    >
      {formatted}
    </span>
  );
}
