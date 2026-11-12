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
        variant === "hero" && "text-[48px] lg:text-[64px] font-extralight tracking-[-0.04em] leading-none text-ink",
        variant === "total" && "text-[36px] leading-[40px] font-light tracking-[-0.02em] text-ink",
        variant === "table" && "text-right font-normal",
        variant === "body" && "text-[15px]",
        isNegative && "text-ebb font-medium",
        isZero && "text-ink-3",
        className
      )}
    >
      {formatted}
    </span>
  );
}
