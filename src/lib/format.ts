/**
 * FinFlow standard formatting library
 * Single source of truth for numbers, money, and dates.
 * Follows Section 8.1 of FINFLOW_UI_DESIGN_SYSTEM.md.
 */

export function formatMoney(
  amount: number | string,
  currency = "PKR",
  options?: {
    decimals?: number;
    compactHero?: boolean;
  }
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(num)) {
    return `${currency} 0.00`;
  }

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  let decimals = options?.decimals ?? 2;
  if (options?.compactHero && absNum >= 100000) {
    decimals = 0;
  }

  const formattedNum = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(absNum);

  const prefix = isNegative ? "\u2212" : ""; // Unicode true minus sign (U+2212)
  return `${prefix}${currency} ${formattedNum}`;
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function formatDate(date: Date | string | number): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateCompact(date: Date | string | number): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(d);
}

export function formatRelativeDue(days: number): string {
  if (days === 0) return "due today";
  if (days > 0) return `due in ${days} ${days === 1 ? "day" : "days"}`;
  const overdueDays = Math.abs(days);
  return `${overdueDays} ${overdueDays === 1 ? "day" : "days"} overdue`;
}
