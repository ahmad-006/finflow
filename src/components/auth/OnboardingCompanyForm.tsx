"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { completeOnboardingAction } from "@/modules/auth/actions";
import type { AuthActionResult } from "@/modules/auth/types";

const CURRENCIES = [
  { code: "PKR", symbol: "₨", label: "PKR (Pakistani Rupee)" },
  { code: "USD", symbol: "$", label: "USD (US Dollar)" },
  { code: "EUR", symbol: "€", label: "EUR (Euro)" },
  { code: "GBP", symbol: "£", label: "GBP (British Pound)" },
  { code: "AED", symbol: "AED", label: "AED (UAE Dirham)" },
  { code: "SAR", symbol: "SAR", label: "SAR (Saudi Riyal)" },
  { code: "CAD", symbol: "CA$", label: "CAD (Canadian Dollar)" },
] as const;

const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: "₨",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED",
  SAR: "SAR",
  CAD: "CA$",
};

const initialState: AuthActionResult = {
  success: false,
};

export function OnboardingCompanyForm() {
  const router = useRouter();
  const [selectedCurrency, setSelectedCurrency] = React.useState<string>("PKR");

  const [state, formAction, isPending] = useActionState(
    completeOnboardingAction,
    initialState
  );

  React.useEffect(() => {
    if (state?.success && state?.redirectUrl) {
      router.push(state.redirectUrl);
      router.refresh();
    }
  }, [state, router]);

  const currencySymbol = CURRENCY_SYMBOLS[selectedCurrency] ?? selectedCurrency;

  return (
    <div className="w-full">
      <form action={formAction} className="flex flex-col gap-6">
        {state?.error && (
          <InlineAlert
            variant="negative"
            message={state.error}
          />
        )}

        {state?.errors && Object.keys(state.errors).length > 0 && !state.error && (
          <InlineAlert
            variant="negative"
            message={Object.values(state.errors).flat().join(" ")}
          />
        )}

        <div>
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            name="companyName"
            type="text"
            required
            minLength={2}
            autoFocus
            placeholder="Rehman and Sons Trading"
            autoComplete="organization"
            isInvalid={Boolean(state?.errors?.companyName)}
            className="min-h-[44px]"
          />
          {state?.errors?.companyName && (
            <p className="mt-1.5 text-[13px] text-ember-ink">
              {state.errors.companyName[0]}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="baseCurrency">Base Currency</Label>
          <Select
            id="baseCurrency"
            name="baseCurrency"
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="min-h-[44px]"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="liquidReserve">Opening Liquid Reserve</Label>
          <div className="relative flex items-center">
            <span
              className="absolute left-[18px] z-10 font-mono text-[15px] font-medium text-ink-3 pointer-events-none select-none"
              aria-hidden="true"
            >
              {currencySymbol}
            </span>
            <Input
              id="liquidReserve"
              name="liquidReserve"
              type="number"
              step="any"
              min="0"
              defaultValue="0"
              required
              isInvalid={Boolean(state?.errors?.liquidReserve)}
              className="pl-16 pr-[18px] tabular-nums min-h-[44px]"
            />
          </div>
          {state?.errors?.liquidReserve ? (
            <p className="mt-1.5 text-[13px] text-ember-ink">
              {state.errors.liquidReserve[0]}
            </p>
          ) : (
            <p className="mt-1.5 text-[13px] text-ink-3">
              Available cash balance across your corporate accounts today.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="safetyBuffer">Safety Buffer Threshold</Label>
          <div className="relative flex items-center">
            <span
              className="absolute left-[18px] z-10 font-mono text-[15px] font-medium text-ink-3 pointer-events-none select-none"
              aria-hidden="true"
            >
              {currencySymbol}
            </span>
            <Input
              id="safetyBuffer"
              name="safetyBuffer"
              type="number"
              step="any"
              min="0"
              defaultValue="0"
              required
              isInvalid={Boolean(state?.errors?.safetyBuffer)}
              className="pl-16 pr-[18px] tabular-nums min-h-[44px]"
            />
          </div>
          {state?.errors?.safetyBuffer ? (
            <p className="mt-1.5 text-[13px] text-ember-ink">
              {state.errors.safetyBuffer[0]}
            </p>
          ) : (
            <p className="mt-1.5 text-[13px] text-ink-3">
              Minimum cash balance to maintain before warning of a shortfall.
            </p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="default"
            className="w-full min-h-[44px] h-12 rounded-full text-[17px] font-medium"
            isLoading={isPending}
            disabled={isPending}
          >
            Complete setup and launch cockpit
          </Button>
        </div>
      </form>
    </div>
  );
}
