import React from "react";

export type FigureSize = "xl" | "lg" | "md" | "row";

export interface FigureProps {
  value: number | string;
  currency?: string;
  size?: FigureSize;
  className?: string;
  showDecimals?: boolean;
}

export function Figure({
  value,
  currency = "PKR",
  size = "md",
  className = "",
  showDecimals = true,
}: FigureProps) {
  const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  const isNegative = num < 0;
  const absNum = Math.abs(isNaN(num) ? 0 : num);

  // Format integer and fractional parts
  const parts = absNum.toFixed(2).split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decPart = `.${parts[1]}`;

  // Size styling map
  const sizeClasses: Record<FigureSize, { container: string; currency: string; number: string; decimals: string }> = {
    xl: {
      container: "text-[clamp(36px,4.5vw,52px)] leading-none tracking-[-0.035em] font-light",
      currency: "text-[0.5em] font-normal mr-2 text-[var(--ink-3)]",
      number: isNegative ? "text-[var(--ember-ink)]" : "text-[var(--ink)]",
      decimals: "text-[0.55em] font-light text-[var(--ink-3)]",
    },
    lg: {
      container: "text-[26px] sm:text-[30px] leading-tight tracking-[-0.025em] font-light",
      currency: "text-[0.55em] font-normal mr-1.5 text-[var(--ink-3)]",
      number: isNegative ? "text-[var(--ember-ink)]" : "text-[var(--ink)]",
      decimals: "text-[0.65em] font-normal text-[var(--ink-3)]",
    },
    md: {
      container: "text-[28px] leading-[32px] tracking-[-0.02em] font-light",
      currency: "text-[0.6em] font-normal mr-1 text-[var(--ink-3)]",
      number: isNegative ? "text-[var(--ember-ink)]" : "text-[var(--ink)]",
      decimals: "text-[0.7em] font-normal text-[var(--ink-3)]",
    },
    row: {
      container: "text-[17px] leading-[24px] tracking-normal font-medium",
      currency: "text-[0.75em] font-normal mr-1 text-[var(--ink-3)]",
      number: isNegative ? "text-[var(--ember-ink)]" : "text-[var(--ink)]",
      decimals: "text-[0.8em] font-normal text-[var(--ink-3)]",
    },
  };

  const current = sizeClasses[size] || sizeClasses.md;

  return (
    <span className={`inline-flex items-baseline tabular-nums ${current.container} ${className}`}>
      {currency && <span className={current.currency}>{currency}</span>}
      <span className={current.number}>
        {isNegative ? "-" : ""}
        {intPart}
      </span>
      {showDecimals && <span className={current.decimals}>{decPart}</span>}
    </span>
  );
}
