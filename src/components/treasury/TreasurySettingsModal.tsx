"use client";

import * as React from "react";
import { z } from "zod";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { formatUserError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateTreasurySettingsAction } from "@/modules/treasury/actions";

function hasMaxTwoDecimals(val: number): boolean {
  const scaled = Math.round(val * 100);
  return Math.abs(val - scaled / 100) < 1e-6;
}

const settingsSchema = z.object({
  liquidReserve: z.coerce
    .number({ message: "Liquid reserve must be a valid number" })
    .min(0, "Liquid reserve cannot be negative")
    .max(10_000_000_000, "Liquid reserve cannot exceed 10,000,000,000")
    .refine(hasMaxTwoDecimals, "Maximum 2 decimal places allowed"),
  safetyBuffer: z.coerce
    .number({ message: "Safety buffer must be a valid number" })
    .min(0, "Safety buffer cannot be negative")
    .max(10_000_000_000, "Safety buffer cannot exceed 10,000,000,000")
    .refine(hasMaxTwoDecimals, "Maximum 2 decimal places allowed"),
});

export interface TreasurySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentReserve: number;
  currentBuffer: number;
  baseCurrency?: string;
  onSuccess?: (newReserve: number, newBuffer: number) => void;
}

export function TreasurySettingsModal({
  isOpen,
  onClose,
  currentReserve,
  currentBuffer,
  baseCurrency = "PKR",
  onSuccess,
}: TreasurySettingsModalProps) {
  const [isPending, startTransition] = React.useTransition();
  const [reserveInput, setReserveInput] = React.useState<string>(String(currentReserve));
  const [bufferInput, setBufferInput] = React.useState<string>(String(currentBuffer));
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      setReserveInput(String(currentReserve));
      setBufferInput(String(currentBuffer));
      setErrorBanner(null);
      setFieldErrors({});
    }
  }, [isOpen, currentReserve, currentBuffer]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setFieldErrors({});

    const parseResult = settingsSchema.safeParse({
      liquidReserve: reserveInput,
      safetyBuffer: bufferInput,
    });

    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0];
        if (field && typeof field === "string") {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    const { liquidReserve, safetyBuffer } = parseResult.data;

    startTransition(async () => {
      try {
        const res = await updateTreasurySettingsAction({
          liquidReserve,
          safetyBuffer,
        });

        if (!res.success) {
          setErrorBanner(res.error || "Failed to update treasury settings.");
          if (res.errors) {
            const mapped: Record<string, string> = {};
            for (const [k, v] of Object.entries(res.errors)) {
              if (v && v.length > 0) {
                mapped[k] = v[0];
              }
            }
            setFieldErrors(mapped);
          }
        } else {
          onSuccess?.(liquidReserve, safetyBuffer);
          onClose();
        }
      } catch (err) {
        setErrorBanner(
          formatUserError(err, "Unable to save treasury settings. Check your network connection.")
        );
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="treasury-settings-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/30 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal surface */}
      <div className="relative w-full max-w-[520px] rounded-[18px] bg-white border border-line p-6 sm:p-7 z-10 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-line">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3">
              Liquidity Controls
            </span>
            <h2 id="treasury-settings-modal-title" className="text-xl font-serif text-ink tracking-tight mt-0.5">
              Adjust Liquidity Reserve &amp; Safety Buffer
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-fog transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorBanner && (
          <div className="flex items-center gap-2 p-3 rounded-[10px] border border-ember/30 bg-ember-tint text-ember-ink text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}

        {/* Current values reference */}
        <div className="p-3.5 rounded-[12px] bg-fog/50 border border-line grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-ink-3 block">Current reserve</span>
            <span className="text-sm font-serif font-bold text-ink mt-0.5 block">
              {formatMoney(currentReserve, baseCurrency)}
            </span>
          </div>
          <div>
            <span className="text-ink-3 block">Current safety buffer</span>
            <span className="text-sm font-serif font-bold text-ink mt-0.5 block">
              {formatMoney(currentBuffer, baseCurrency)}
            </span>
          </div>
        </div>

        {/* Form fields */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Liquid Reserve */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="liquidReserve" className="text-xs font-mono uppercase tracking-wider text-ink-3">
                Liquid cash reserve ({baseCurrency}) *
              </Label>
              <span className="text-[11px] text-ink-3">Opening cash on hand</span>
            </div>
            <Input
              id="liquidReserve"
              type="number"
              step="0.01"
              min="0"
              value={reserveInput}
              onChange={(e) => setReserveInput(e.target.value)}
              required
              isInvalid={Boolean(fieldErrors.liquidReserve)}
              className="h-11 text-sm rounded-[10px]"
            />
            {fieldErrors.liquidReserve && (
              <span className="text-[11px] text-ember-ink">{fieldErrors.liquidReserve}</span>
            )}
          </div>

          {/* Safety Buffer */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="safetyBuffer" className="text-xs font-mono uppercase tracking-wider text-ink-3">
                Safety buffer threshold ({baseCurrency}) *
              </Label>
              <span className="text-[11px] text-ink-3">Red-alert floor</span>
            </div>
            <Input
              id="safetyBuffer"
              type="number"
              step="0.01"
              min="0"
              value={bufferInput}
              onChange={(e) => setBufferInput(e.target.value)}
              required
              isInvalid={Boolean(fieldErrors.safetyBuffer)}
              className="h-11 text-sm rounded-[10px]"
            />
            {fieldErrors.safetyBuffer && (
              <span className="text-[11px] text-ember-ink">{fieldErrors.safetyBuffer}</span>
            )}
          </div>

          {/* Operational explanation */}
          <div className="p-3 rounded-[10px] bg-fog border border-line text-[12px] text-ink-2 leading-relaxed flex flex-col gap-1">
            <p>
              Your liquid reserve sets the opening balance for 30-day cash projections.
            </p>
            <p className="text-ink-3">
              When projected balance dips below the safety buffer, the forecast marks deficit days in red.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isPending}
              className="min-h-[44px] h-11 px-5 rounded-full text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="min-h-[44px] h-11 px-6 rounded-full bg-ink text-white hover:bg-ink-hover text-xs font-medium"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Updating...
                </>
              ) : (
                "Save settings"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
