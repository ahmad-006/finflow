"use client";

import * as React from "react";
import Decimal from "decimal.js";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { formatUserError } from "@/lib/errors";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateTreasurySettingsAction } from "@/modules/treasury/actions";

function hasMaxTwoDecimals(val: number): boolean {
  try {
    return new Decimal(val).decimalPlaces() <= 2;
  } catch {
    return false;
  }
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

const TREASURY_SETTINGS_FORM_ID = "treasury-settings-modal-form";

function TreasurySettingsModalContent({
  onClose,
  currentReserve,
  currentBuffer,
  baseCurrency = "PKR",
  onSuccess,
}: Omit<TreasurySettingsModalProps, "isOpen">) {
  const [isPending, startTransition] = React.useTransition();
  const [reserveInput, setReserveInput] = React.useState<string>(() => String(currentReserve));
  const [bufferInput, setBufferInput] = React.useState<string>(() => String(currentBuffer));
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

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
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      eyebrow="Liquidity Controls"
      title="Adjust Liquidity Reserve & Safety Buffer"
      preventClose={isPending}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
            className="min-h-[44px] h-11 px-5 rounded-full text-sm font-medium"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={TREASURY_SETTINGS_FORM_ID}
            isLoading={isPending}
            className="min-h-[44px] h-11 px-6 rounded-full text-sm font-medium"
          >
            {isPending ? "Updating..." : "Save settings"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {errorBanner && (
          <div className="flex items-center gap-2 p-3 rounded-[10px] border border-ember/30 bg-ember-tint text-ember-ink text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}

        <div className="p-3.5 rounded-[12px] bg-fog/50 border border-line grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-ink-3 block">Current reserve</span>
            <span className="text-sm font-sans font-semibold text-ink mt-0.5 block num">
              {formatMoney(currentReserve, baseCurrency)}
            </span>
          </div>
          <div>
            <span className="text-ink-3 block">Current safety buffer</span>
            <span className="text-sm font-sans font-semibold text-ink mt-0.5 block num">
              {formatMoney(currentBuffer, baseCurrency)}
            </span>
          </div>
        </div>

        <form id={TREASURY_SETTINGS_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="liquidReserve" className="mb-0">
                Liquid cash reserve ({baseCurrency}) *
              </Label>
              <span className="text-xs text-ink-3">Opening cash on hand</span>
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
              className="h-11 text-sm rounded-[10px] num"
            />
            {fieldErrors.liquidReserve && (
              <span className="mt-1 block text-xs text-ember-ink">{fieldErrors.liquidReserve}</span>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="safetyBuffer" className="mb-0">
                Safety buffer threshold ({baseCurrency}) *
              </Label>
              <span className="text-xs text-ink-3">Red-alert floor</span>
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
              className="h-11 text-sm rounded-[10px] num"
            />
            {fieldErrors.safetyBuffer && (
              <span className="mt-1 block text-xs text-ember-ink">{fieldErrors.safetyBuffer}</span>
            )}
          </div>

          <div className="p-3 rounded-[10px] bg-fog border border-line text-xs text-ink-2 leading-relaxed flex flex-col gap-1">
            <p>
              Your liquid reserve sets the opening balance for 30-day cash projections.
            </p>
            <p className="text-ink-3">
              When projected balance dips below the safety buffer, the forecast marks deficit days in red.
            </p>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function TreasurySettingsModal({
  isOpen,
  onClose,
  currentReserve,
  currentBuffer,
  baseCurrency = "PKR",
  onSuccess,
}: TreasurySettingsModalProps) {
  if (!isOpen) return null;
  return (
    <TreasurySettingsModalContent
      key={`${currentReserve}-${currentBuffer}`}
      onClose={onClose}
      currentReserve={currentReserve}
      currentBuffer={currentBuffer}
      baseCurrency={baseCurrency}
      onSuccess={onSuccess}
    />
  );
}
