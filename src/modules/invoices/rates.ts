"use server";

import type { InvoiceCurrency } from "./types";
import { DEFAULT_EXCHANGE_RATES, SUPPORTED_CURRENCIES } from "./currency";

interface RateCacheEntry {
  timestamp: number;
  rates: Record<InvoiceCurrency, number>;
}

const memoryRateCache: Record<string, RateCacheEntry> = {};
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Fetches latest spot exchange rates from ExchangeRate-API.
 * Uses EXCHANGE_RATE_API_KEY if configured in environment, otherwise uses the open developer endpoint.
 * Caches results for 24 hours. Falls back cleanly to DEFAULT_EXCHANGE_RATES on network failure.
 */
export async function getLiveExchangeRates(
  baseCurrency: InvoiceCurrency = "PKR"
): Promise<Record<InvoiceCurrency, number>> {
  const normalizedBase = (baseCurrency.toUpperCase() as InvoiceCurrency) || "PKR";

  // Check in-memory cache first
  const cached = memoryRateCache[normalizedBase];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.rates;
  }

  const apiKey = process.env.EXCHANGE_RATE_API_KEY?.trim();
  const endpoint = apiKey
    ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${normalizedBase}`
    : `https://open.er-api.com/v6/latest/${normalizedBase}`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 }, // 24-hour Next.js Data Cache
    });

    if (!response.ok) {
      console.warn(`[ExchangeRate-API HTTP ${response.status}]: Falling back to baseline rates.`);
      return DEFAULT_EXCHANGE_RATES;
    }

    const data = await response.json();
    if (data.result !== "success" || !data.rates) {
      console.warn(`[ExchangeRate-API Error]: ${data["error-type"] || "Malformed response"}. Falling back.`);
      return DEFAULT_EXCHANGE_RATES;
    }

    const calculatedRates: Record<InvoiceCurrency, number> = {
      PKR: 1.0,
      USD: DEFAULT_EXCHANGE_RATES.USD,
      EUR: DEFAULT_EXCHANGE_RATES.EUR,
      GBP: DEFAULT_EXCHANGE_RATES.GBP,
      AED: DEFAULT_EXCHANGE_RATES.AED,
    };

    for (const currency of SUPPORTED_CURRENCIES) {
      if (currency === normalizedBase) {
        calculatedRates[currency] = 1.0;
      } else {
        const foreignRate = Number(data.rates[currency]);
        if (foreignRate && foreignRate > 0) {
          calculatedRates[currency] = Number((1 / foreignRate).toFixed(4));
        }
      }
    }

    memoryRateCache[normalizedBase] = {
      timestamp: Date.now(),
      rates: calculatedRates,
    };

    return calculatedRates;
  } catch (error) {
    console.error("[Live Rates Fetch Error]:", error);
    return DEFAULT_EXCHANGE_RATES;
  }
}

/**
 * Server action to fetch live spot exchange rates on demand.
 */
export async function getLiveExchangeRatesAction(
  baseCurrency?: string
): Promise<{ success: boolean; rates: Record<InvoiceCurrency, number> }> {
  try {
    const base = (baseCurrency as InvoiceCurrency) || "PKR";
    const rates = await getLiveExchangeRates(base);
    return { success: true, rates };
  } catch {
    return { success: false, rates: DEFAULT_EXCHANGE_RATES };
  }
}
