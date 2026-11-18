import Decimal from "decimal.js";
import type { InvoiceCurrency } from "./types";

// Configure arbitrary-precision financial math
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const SUPPORTED_CURRENCIES: readonly InvoiceCurrency[] = [
  "PKR",
  "USD",
  "EUR",
  "GBP",
  "AED",
] as const;

export const DEFAULT_EXCHANGE_RATES: Record<InvoiceCurrency, number> = {
  PKR: 1.0,
  USD: 278.4,
  EUR: 301.25,
  GBP: 351.9,
  AED: 75.8,
};

export const CURRENCY_SYMBOLS: Record<InvoiceCurrency, string> = {
  PKR: "₨",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED",
};

export const CURRENCY_NAMES: Record<InvoiceCurrency, string> = {
  PKR: "Pakistani Rupee",
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  AED: "UAE Dirham",
};

/**
 * Safely converts any numeric value, string, or Decimal to a Decimal instance.
 */
export function toDecimal(val: Decimal | number | string | null | undefined): Decimal {
  if (val === null || val === undefined || val === "") {
    return new Decimal(0);
  }
  if (val instanceof Decimal) {
    return val;
  }
  try {
    return new Decimal(val);
  } catch {
    return new Decimal(0);
  }
}

/**
 * Rounds monetary amounts to exactly 2 decimal places using standard financial round half-up.
 */
export function roundMoney(val: Decimal | number | string): Decimal {
  return toDecimal(val).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Rounds exchange rates to 8 decimal places for spot FX precision.
 */
export function roundFx(val: Decimal | number | string): Decimal {
  return toDecimal(val).toDecimalPlaces(8, Decimal.ROUND_HALF_UP);
}

/**
 * Computes individual line item total with arbitrary precision: quantity * unitPrice.
 */
export function calculateLineItem(
  quantity: Decimal | number | string,
  unitPrice: Decimal | number | string
): Decimal {
  const qty = toDecimal(quantity);
  const price = toDecimal(unitPrice);
  return qty.mul(price).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export interface InvoiceCalculations {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  baseTotalAmount: number;
  exchangeRate: number;
  subtotalDecimal: Decimal;
  taxAmountDecimal: Decimal;
  totalAmountDecimal: Decimal;
  baseTotalAmountDecimal: Decimal;
  exchangeRateDecimal: Decimal;
  lineItems: Array<{
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    lineTotalDecimal: Decimal;
  }>;
}

/**
 * Calculates complete invoice totals, line item breakdown, taxes, and company base currency normalization.
 */
export function calculateInvoiceTotals(
  items: Array<{ quantity: Decimal | number | string; unitPrice: Decimal | number | string }>,
  taxRatePercent: Decimal | number | string = 0,
  currency: InvoiceCurrency = "PKR",
  customExchangeRate?: Decimal | number | string
): InvoiceCalculations {
  const taxRate = toDecimal(taxRatePercent);

  // Determine spot FX rate
  let fxRate: Decimal;
  if (currency === "PKR") {
    fxRate = new Decimal(1.0);
  } else if (customExchangeRate !== undefined && customExchangeRate !== null && toDecimal(customExchangeRate).gt(0)) {
    fxRate = roundFx(customExchangeRate);
  } else {
    fxRate = roundFx(DEFAULT_EXCHANGE_RATES[currency] ?? 1.0);
  }

  let subtotal = new Decimal(0);
  const lineItems = items.map((item) => {
    const lineTotal = calculateLineItem(item.quantity, item.unitPrice);
    subtotal = subtotal.plus(lineTotal);
    return {
      quantity: toDecimal(item.quantity).toNumber(),
      unitPrice: toDecimal(item.unitPrice).toNumber(),
      lineTotal: lineTotal.toNumber(),
      lineTotalDecimal: lineTotal,
    };
  });

  subtotal = subtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const taxAmount = subtotal
    .mul(taxRate)
    .div(100)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const totalAmount = subtotal.plus(taxAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  // Normalize to base currency (PKR)
  const baseTotalAmount = currency === "PKR"
    ? totalAmount
    : totalAmount.mul(fxRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    subtotal: subtotal.toNumber(),
    taxRate: taxRate.toNumber(),
    taxAmount: taxAmount.toNumber(),
    totalAmount: totalAmount.toNumber(),
    baseTotalAmount: baseTotalAmount.toNumber(),
    exchangeRate: fxRate.toNumber(),
    subtotalDecimal: subtotal,
    taxAmountDecimal: taxAmount,
    totalAmountDecimal: totalAmount,
    baseTotalAmountDecimal: baseTotalAmount,
    exchangeRateDecimal: fxRate,
    lineItems,
  };
}

/**
 * Formats a monetary value cleanly with thousands separators and 2 decimal places.
 * Example: formatMoney(1250, "USD") => "$1,250.00"
 */
export function formatMoney(
  amount: Decimal | number | string,
  currency: InvoiceCurrency = "PKR",
  options?: { showCode?: boolean }
): string {
  const num = toDecimal(amount).toNumber();
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

  if (options?.showCode) {
    return `${symbol} ${formatted} (${currency})`;
  }

  if (currency === "AED") {
    return `AED ${formatted}`;
  }

  return `${symbol} ${formatted}`;
}

/**
 * Converts an amount from one currency to another via base PKR exchange rates.
 */
export function convertAmount(
  amount: Decimal | number | string,
  fromCurrency: InvoiceCurrency,
  toCurrency: InvoiceCurrency,
  customRates?: Partial<Record<InvoiceCurrency, number>>
): Decimal {
  if (fromCurrency === toCurrency) {
    return roundMoney(amount);
  }

  const amt = toDecimal(amount);
  const fromRate = toDecimal(customRates?.[fromCurrency] ?? DEFAULT_EXCHANGE_RATES[fromCurrency] ?? 1.0);
  const toRate = toDecimal(customRates?.[toCurrency] ?? DEFAULT_EXCHANGE_RATES[toCurrency] ?? 1.0);

  // Convert to base PKR first: foreign amount * spot rate
  const inPkr = fromCurrency === "PKR" ? amt : amt.mul(fromRate);

  // Convert PKR to target currency: PKR / target spot rate
  const result = toCurrency === "PKR" ? inPkr : inPkr.div(toRate);

  return roundMoney(result);
}
